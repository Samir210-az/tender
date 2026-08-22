import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { extractText } from '@/lib/ai/textExtraction';
import { parseAzDate } from '@/lib/ai/parseDate';
import { completeJSON, AI_META } from '@/lib/ai/provider';
import { completeJSONWithFile, GEMINI_META } from '@/lib/ai/gemini';
import { chunkText } from '@/lib/ai/chunkText';
import {
  DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
  buildDocumentAnalysisUserPrompt,
  buildFileAnalysisUserPrompt,
  DOCUMENT_ANALYSIS_PROMPT_VERSION,
} from '@/lib/prompts/documentAnalysis';

export const maxDuration = 120; // Çoxhissəli (chunked) analiz üçün — Vercel Pro plan tələb edir

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId, docId } = await params;
  const db = getSupabaseAdmin();

  // Tender-in bu qeydiyyata aid olduğunu doğrula
  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .select('id, jurisdiction')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  if (tenderErr || !tender) {
    return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });
  }

  const { data: doc, error: docErr } = await db
    .from('tender_documents')
    .select('*')
    .eq('id', docId)
    .eq('tender_id', tenderId)
    .single();
  if (docErr || !doc) {
    return NextResponse.json({ error: 'Sənəd tapılmadı' }, { status: 404 });
  }

  try {
    await db.from('tender_documents').update({ ocr_status: 'processing' }).eq('id', docId);

    // 1. Faylı Storage-dən endir
    const { data: fileBlob, error: downloadErr } = await db.storage
      .from('tender-documents')
      .download(doc.file_path);
    if (downloadErr) throw new Error(`Fayl endirilə bilmədi: ${downloadErr.message}`);

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const isImage = IMAGE_TYPES.has(doc.mime_type);

    let result, aiMeta, pageCount = null;

    if (isImage) {
      // Şəkil sənədlər həmişə Gemini vision ilə (Groq mətn-yalnızdır, şəkil oxuya bilmir)
      const base64 = buffer.toString('base64');
      const userPrompt = buildFileAnalysisUserPrompt(doc.file_name, tender.jurisdiction);
      result = await completeJSONWithFile(DOCUMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt, base64, doc.mime_type);
      aiMeta = GEMINI_META;
    } else {
      // 2. Mətn çıxarmağa cəhd et (PDF/DOCX/XLSX/TXT/CSV)
      const extracted = await extractText(buffer, doc.mime_type, doc.file_name);
      pageCount = extracted.pageCount;

      const looksScanned = !extracted.supported || !extracted.text || extracted.text.trim().length < 20;

      if (looksScanned && doc.mime_type === 'application/pdf') {
        // Skan olunmuş PDF ehtimalı — Gemini vision fallback (PDF-i birbaşa göndər)
        const base64 = buffer.toString('base64');
        const userPrompt = buildFileAnalysisUserPrompt(doc.file_name, tender.jurisdiction);
        result = await completeJSONWithFile(DOCUMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt, base64, 'application/pdf');
        aiMeta = GEMINI_META;
      } else if (!extracted.supported) {
        await db
          .from('tender_documents')
          .update({
            ocr_status: 'failed',
            analysis_error: 'Bu fayl tipi dəstəklənmir (application/msword köhnə .doc və ZIP hələ dəstəklənmir)',
          })
          .eq('id', docId);
        return NextResponse.json({ error: 'Fayl tipi dəstəklənmir' }, { status: 422 });
      } else {
        // Normal mətn əsaslı analiz (Groq) — TPM limitinə görə hissələrə bölünür
        const MAX_CHARS = 8000;
        const chunks = chunkText(extracted.text, MAX_CHARS);

        if (chunks.length === 1) {
          const userPrompt = buildDocumentAnalysisUserPrompt(chunks[0], doc.file_name, tender.jurisdiction);
          result = await completeJSON(DOCUMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt);
        } else {
          // Bir neçə hissə — ardıcıl analiz edib nəticələri birləşdiririk.
          // Groq-un 30 RPM limitinə hörmət üçün hissələr arası kiçik fasilə.
          const merged = { document_category: null, language_detected: null, requirements: [] };
          for (let i = 0; i < chunks.length; i++) {
            if (i > 0) await new Promise((r) => setTimeout(r, 2200));
            const userPrompt = buildDocumentAnalysisUserPrompt(chunks[i], doc.file_name, tender.jurisdiction);
            const chunkResult = await completeJSON(DOCUMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt);
            if (!merged.document_category && chunkResult.document_category) {
              merged.document_category = chunkResult.document_category;
            }
            if (!merged.language_detected && chunkResult.language_detected) {
              merged.language_detected = chunkResult.language_detected;
            }
            if (Array.isArray(chunkResult.requirements)) {
              merged.requirements.push(...chunkResult.requirements);
            }
          }
          result = merged;
        }
        aiMeta = AI_META;
      }
    }

    if (!result.requirements || !Array.isArray(result.requirements)) {
      throw new Error('AI cavabında requirements array tapılmadı');
    }

    // 4. Requirements-i DB-yə yaz
    // Əvvəlcə bu sənəd üçün köhnə tələbləri sil (təkrar analiz zamanı
    // dublikat yaranmasın — idempotent re-analiz).
    await db.from('tender_requirements').delete().eq('document_id', docId);

    if (result.requirements.length > 0) {
      const rows = result.requirements.map((r) => {
        const parsedDeadline = r.deadline ? parseAzDate(r.deadline) : null;
        return {
          tender_id: tenderId,
          document_id: docId,
          title: r.title || 'Başlıqsız tələb',
          description: r.description || null,
          category: r.category || null,
          mandatory: r.mandatory !== false,
          deadline: parsedDeadline, // parse olunmayıbsa null — heç vaxt uydurma
          deadline_raw: r.deadline || null, // orijinal mətn HƏMİŞƏ saxlanılır
          source_excerpt: r.source_excerpt || null,
          source_page: r.source_page || null,
          confidence: r.confidence || 'low',
          ai_provider: aiMeta.provider,
          ai_model: aiMeta.model,
        };
      });
      const { error: insertErr } = await db.from('tender_requirements').insert(rows);
      if (insertErr) throw new Error(`Requirements yazıla bilmədi: ${insertErr.message}`);
    }

    // 5. Sənəd sətrini yenilə
    await db
      .from('tender_documents')
      .update({
        category: result.document_category || 'other',
        ocr_status: 'done',
        page_count: pageCount,
        ai_language: result.language_detected || null,
        analyzed_at: new Date().toISOString(),
        analysis_error: null,
      })
      .eq('id', docId);

    return NextResponse.json({
      success: true,
      requirementsFound: result.requirements.length,
      category: result.document_category,
      promptVersion: DOCUMENT_ANALYSIS_PROMPT_VERSION,
      aiMeta,
    });
  } catch (err) {
    await db
      .from('tender_documents')
      .update({ ocr_status: 'failed', analysis_error: err.message })
      .eq('id', docId);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

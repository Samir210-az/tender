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

const VALID_REQUIREMENT_CATEGORIES = new Set([
  'legal', 'financial', 'technical', 'experience',
  'personnel', 'equipment', 'administrative', 'deadline',
]);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_DOCUMENT_CATEGORIES = new Set([
  'tender_notice', 'terms_of_reference', 'technical_spec', 'administrative',
  'eligibility', 'financial', 'qualification', 'contract_draft',
  'evaluation_criteria', 'pricing_form', 'submission_form', 'other',
]);

function normalizeForMatch(s) {
  return (s || '').toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/**
 * Hər tələbin "source_excerpt"-inin FAKTIKI olaraq sənəd mətnində mövcud
 * olduğunu yoxlayır. Bu, prompt-a etibar etmək əvəzinə texniki zəmanətdir —
 * AI hüquqi kontekstdən (və ya başqa xarici mənbədən) tələb "çıxarıb" onu
 * sənəddən sitat kimi göstərsə belə, bu yoxlama onu tutur və atır.
 */
function verifyAndFilterRequirements(requirements, sourceText) {
  const normalizedSource = normalizeForMatch(sourceText);
  const verified = [];
  let droppedCount = 0;

  for (const r of requirements) {
    const excerpt = normalizeForMatch(r.source_excerpt);
    if (excerpt.length >= 10 && normalizedSource.includes(excerpt)) {
      verified.push(r);
    } else {
      droppedCount++;
    }
  }

  return { verified, droppedCount };
}

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
        let totalDropped = 0;

        if (chunks.length === 1) {
          const userPrompt = buildDocumentAnalysisUserPrompt(chunks[0], doc.file_name, tender.jurisdiction);
          const raw = await completeJSON(DOCUMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt);
          const { verified, droppedCount } = verifyAndFilterRequirements(raw.requirements || [], chunks[0]);
          totalDropped += droppedCount;
          result = { ...raw, requirements: verified };
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
              const { verified, droppedCount } = verifyAndFilterRequirements(chunkResult.requirements, chunks[i]);
              totalDropped += droppedCount;
              merged.requirements.push(...verified);
            }
          }
          result = merged;
        }
        aiMeta = AI_META;
        if (totalDropped > 0) {
          console.warn(`${totalDropped} tələb source_excerpt yoxlamasından keçmədi və atıldı (docId: ${docId})`);
        }
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
        const rawCategory = (r.category || '').toLowerCase().trim();
        const category = VALID_REQUIREMENT_CATEGORIES.has(rawCategory) ? rawCategory : null;
        const rawConfidence = (r.confidence || '').toLowerCase().trim();
        const confidence = VALID_CONFIDENCE.has(rawConfidence) ? rawConfidence : 'low';
        return {
          tender_id: tenderId,
          document_id: docId,
          title: r.title || 'Başlıqsız tələb',
          description: r.description || null,
          category, // whitelist-dən kənar dəyər DB constraint-i pozmasın deyə null-a düşür
          mandatory: r.mandatory !== false,
          deadline: parsedDeadline, // parse olunmayıbsa null — heç vaxt uydurma
          deadline_raw: r.deadline || null, // orijinal mətn HƏMİŞƏ saxlanılır
          source_excerpt: r.source_excerpt || null,
          source_page: r.source_page || null,
          confidence,
          ai_provider: aiMeta.provider,
          ai_model: aiMeta.model,
        };
      });
      const { error: insertErr } = await db.from('tender_requirements').insert(rows);
      if (insertErr) throw new Error(`Requirements yazıla bilmədi: ${insertErr.message}`);
    }

    // 5. Sənəd sətrini yenilə
    const rawDocCategory = (result.document_category || '').toLowerCase().trim();
    const docCategory = VALID_DOCUMENT_CATEGORIES.has(rawDocCategory) ? rawDocCategory : 'other';
    await db
      .from('tender_documents')
      .update({
        category: docCategory,
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

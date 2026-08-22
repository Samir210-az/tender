import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { extractText } from '@/lib/ai/textExtraction';
import { completeJSON, AI_META } from '@/lib/ai/provider';
import {
  DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
  buildDocumentAnalysisUserPrompt,
  DOCUMENT_ANALYSIS_PROMPT_VERSION,
} from '@/lib/prompts/documentAnalysis';

export const maxDuration = 60; // Vercel serverless timeout (Pro plan üçün)

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId, docId } = await params;
  const db = getSupabaseAdmin();

  // Tender-in bu qeydiyyata aid olduğunu doğrula
  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .select('id')
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

    // 2. Mətn çıxar
    const { text, pageCount, supported } = await extractText(buffer, doc.mime_type, doc.file_name);

    if (!supported) {
      await db
        .from('tender_documents')
        .update({
          ocr_status: 'failed',
          analysis_error: 'Bu fayl tipi hələ dəstəklənmir (yalnız PDF, DOCX, XLS/XLSX, TXT, CSV dəstəklənir)',
        })
        .eq('id', docId);
      return NextResponse.json({ error: 'Fayl tipi dəstəklənmir' }, { status: 422 });
    }

    if (!text || text.trim().length < 20) {
      await db
        .from('tender_documents')
        .update({
          ocr_status: 'failed',
          analysis_error: 'Sənəddən mətn çıxarıla bilmədi (bəlkə skan olunmuş şəkildir — OCR hələ dəstəklənmir)',
        })
        .eq('id', docId);
      return NextResponse.json({ error: 'Mətn tapılmadı' }, { status: 422 });
    }

    // 3. AI analizi
    const systemPrompt = DOCUMENT_ANALYSIS_SYSTEM_PROMPT;
    const userPrompt = buildDocumentAnalysisUserPrompt(text, doc.file_name);
    const result = await completeJSON(systemPrompt, userPrompt);

    if (!result.requirements || !Array.isArray(result.requirements)) {
      throw new Error('AI cavabında requirements array tapılmadı');
    }

    // 4. Requirements-i DB-yə yaz
    // Əvvəlcə bu sənəd üçün köhnə tələbləri sil (təkrar analiz zamanı
    // dublikat yaranmasın — idempotent re-analiz).
    await db.from('tender_requirements').delete().eq('document_id', docId);

    if (result.requirements.length > 0) {
      const rows = result.requirements.map((r) => ({
        tender_id: tenderId,
        document_id: docId,
        title: r.title || 'Başlıqsız tələb',
        description: r.description || null,
        category: r.category || null,
        mandatory: r.mandatory !== false,
        deadline: r.deadline || null,
        source_excerpt: r.source_excerpt || null,
        source_page: r.source_page || null,
        confidence: r.confidence || 'low',
        ai_provider: AI_META.provider,
        ai_model: AI_META.model,
      }));
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
      aiMeta: AI_META,
    });
  } catch (err) {
    await db
      .from('tender_documents')
      .update({ ocr_status: 'failed', analysis_error: err.message })
      .eq('id', docId);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

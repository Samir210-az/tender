import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export const maxDuration = 60;

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9əğıöüşçƏĞIÖÜŞÇİ._\- ]/g, '_');
}

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const { data: tender, error: tenderErr } = await db
    .from('tenders').select('id, name').eq('id', tenderId).eq('registration_id', regId).single();
  if (tenderErr || !tender) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  // Ən son texniki təklif + ən son qiymət cədvəlini götür
  const { data: docs } = await db
    .from('generated_documents')
    .select('*')
    .eq('tender_id', tenderId)
    .in('doc_type', ['technical_proposal', 'price_schedule', 'additional_forms'])
    .order('created_at', { ascending: false });

  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: 'Hələ heç bir sənəd hazırlanmayıb' }, { status: 400 });
  }

  const latestTechnical = docs.find((d) => d.doc_type === 'technical_proposal');
  const latestPrice = docs.find((d) => d.doc_type === 'price_schedule');
  const latestAdditional = docs.find((d) => d.doc_type === 'additional_forms');

  const filesToZip = [latestTechnical, latestPrice, latestAdditional].filter(Boolean);
  if (filesToZip.length === 0) {
    return NextResponse.json({ error: 'Sənəd tapılmadı' }, { status: 400 });
  }

  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const doc of filesToZip) {
      // DOCX
      const { data: docxBlob, error: docxErr } = await db.storage.from('generated-documents').download(doc.file_path);
      if (!docxErr && docxBlob) {
        const buf = Buffer.from(await docxBlob.arrayBuffer());
        zip.file(safeFileName(doc.file_name), buf);
      }
      // PDF (varsa)
      if (doc.file_path_pdf) {
        const { data: pdfBlob, error: pdfErr } = await db.storage.from('generated-documents').download(doc.file_path_pdf);
        if (!pdfErr && pdfBlob) {
          const buf = Buffer.from(await pdfBlob.arrayBuffer());
          zip.file(safeFileName(doc.file_name_pdf), buf);
        }
      }
    }

    // Xəbərdarlıq faylı əlavə et
    zip.file(
      'OXU-XƏBƏRDARLIQ.txt',
      'Bu paketdəki sənədlər AI tərəfindən yaradılıb.\n\n' +
      'Təqdim etməzdən əvvəl MÜTLƏQ hər sənədi diqqətlə oxuyun, yoxlayın və təsdiqləyin.\n' +
      'Xüsusilə: rəqəmlər, tarixlər, şirkət məlumatları və sertifikat/lisenziya iddiaları.\n\n' +
      `Tender: ${tender.name}\n` +
      `Yaradılma tarixi: ${new Date().toLocaleString('az-AZ')}\n`
    );

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFileName = `Teqdimat-Paketi-${Date.now()}.zip`;
    const zipPath = `${tenderId}/${zipFileName}`;

    const { error: uploadErr } = await db.storage
      .from('generated-documents')
      .upload(zipPath, zipBuffer, { contentType: 'application/zip' });
    if (uploadErr) return NextResponse.json({ error: `Storage xətası: ${uploadErr.message}` }, { status: 500 });

    const { data: docRow, error: dbErr } = await db
      .from('generated_documents')
      .insert({
        tender_id: tenderId,
        registration_id: regId,
        doc_type: 'submission_package',
        file_path: zipPath,
        file_name: zipFileName,
        verification_status: 'not_verified',
      })
      .select('*')
      .single();
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({
      document: docRow,
      includedFiles: filesToZip.map((d) => d.doc_type),
      missingTechnical: !latestTechnical,
      missingPrice: !latestPrice,
    });
  } catch (err) {
    return NextResponse.json({ error: `ZIP yaratma xətası: ${err.message}` }, { status: 500 });
  }
}

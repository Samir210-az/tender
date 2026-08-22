import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { buildAddresseeLines, buildSignatureLines, buildFormaTwoPreamble } from '@/lib/letterhead';
import { generatePriceSchedulePdf } from '@/lib/generatePriceSchedulePdf';

export const maxDuration = 60;

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const { data: tender, error: tenderErr } = await db
    .from('tenders').select('*').eq('id', tenderId).eq('registration_id', regId).single();
  if (tenderErr || !tender) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const { data: items, error: itemsErr } = await db
    .from('tender_price_items').select('*').eq('tender_id', tenderId).order('item_no', { ascending: true });
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Qiymət cədvəlində sətir yoxdur' }, { status: 400 });
  }

  const missingPrices = items.filter((i) => i.unit_price === null || i.unit_price === undefined);
  if (missingPrices.length > 0) {
    return NextResponse.json({
      error: `${missingPrices.length} sətirdə qiymət daxil edilməyib — bütün sətirlərə qiymət daxil edin`,
    }, { status: 400 });
  }

  const { data: profile } = await db.from('company_profiles').select('*').eq('registration_id', regId).maybeSingle();
  if (!profile || !profile.legal_name) {
    return NextResponse.json({ error: 'Əvvəlcə şirkət profilini doldurun (/company)' }, { status: 400 });
  }

  const rows = items.map((i) => ({
    ...i,
    lineTotal: Number(i.quantity) * Number(i.unit_price),
  }));
  const grandTotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
  const currency = items[0]?.currency || 'AZN';

  const addresseeLines = buildAddresseeLines({ tender });
  const signatureLines = buildSignatureLines({ profile });

  // DOCX
  const tableRows = [
    new TableRow({
      children: ['Maddə №', 'Təsvir', 'Ölçü vahidi', 'Miqdar', 'Vahidin qiyməti', 'Cəm'].map(
        (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
      ),
    }),
    ...rows.map((r) => new TableRow({
      children: [
        String(r.item_no), r.description, r.unit, String(r.quantity),
        `${Number(r.unit_price).toFixed(2)} ${r.currency}`,
        `${r.lineTotal.toFixed(2)} ${r.currency}`,
      ].map((v) => new TableCell({ children: [new Paragraph(v)] })),
    })),
  ];

  const docxDoc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'TƏQDİM ETMƏZDƏN ƏVVƏL MÜTLƏQ YOXLAYIN — QİYMƏTLƏR ŞİRKƏTİN ÖZ MƏLUMAT BAZASINDAN GƏLİR, AI TƏRƏFİNDƏN UYDURULMAYIB', bold: true, color: 'C0392B', size: 16 })],
          spacing: { after: 300 },
        }),
        new Paragraph({ text: 'FORMA 2 — İŞ HƏCMLƏRİ CƏDVƏLİ (QİYMƏT CƏDVƏLİ)', heading: HeadingLevel.TITLE, spacing: { after: 100 } }),
        new Paragraph({ text: tender.name, heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        ...addresseeLines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 60 } })),
        new Paragraph({ text: '', spacing: { after: 150 } }),
        new Paragraph({ text: 'A. Preambula', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
        ...buildFormaTwoPreamble().map((line, i) => new Paragraph({ children: [new TextRun(`${i + 1}. ${line}`)], spacing: { after: 80 } })),
        new Paragraph({ text: '', spacing: { after: 100 } }),
        new Paragraph({ text: 'B. İş həcmləri üzrə maddələr', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
        new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        new Paragraph({ text: '', spacing: { after: 150 } }),
        new Paragraph({
          children: [new TextRun({ text: `YEKUN CƏM: ${grandTotal.toFixed(2)} ${currency}`, bold: true, size: 26 })],
          spacing: { after: 300 },
        }),
        ...signatureLines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 80 } })),
      ],
    }],
  });
  const docxBuffer = await Packer.toBuffer(docxDoc);
  const docxFileName = `Qiymet-Cedveli-${Date.now()}.docx`;
  const docxPath = `${tenderId}/${docxFileName}`;
  const { error: docxUploadErr } = await db.storage.from('generated-documents').upload(docxPath, docxBuffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  if (docxUploadErr) return NextResponse.json({ error: `DOCX Storage xətası: ${docxUploadErr.message}` }, { status: 500 });

  // PDF
  let pdfPath = null, pdfFileName = null, pdfGenerationError = null;
  try {
    const pdfBuffer = await generatePriceSchedulePdf({
      tenderName: tender.name,
      addresseeLines,
      signatureLines,
      preamble: buildFormaTwoPreamble(),
      rows,
      grandTotal,
      currency,
    });
    pdfFileName = `Qiymet-Cedveli-${Date.now()}.pdf`;
    pdfPath = `${tenderId}/${pdfFileName}`;
    const { error: pdfUploadErr } = await db.storage.from('generated-documents').upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' });
    if (pdfUploadErr) { pdfGenerationError = pdfUploadErr.message; pdfPath = null; pdfFileName = null; }
  } catch (err) {
    pdfGenerationError = err.message;
  }

  const { data: docRow, error: dbErr } = await db
    .from('generated_documents')
    .insert({
      tender_id: tenderId, registration_id: regId, doc_type: 'price_schedule',
      file_path: docxPath, file_name: docxFileName,
      file_path_pdf: pdfPath, file_name_pdf: pdfFileName,
      pdf_generation_error: pdfGenerationError,
      verification_status: 'not_verified', // AI-generated deyil, qiymətlər birbaşa data-dan — verification tələb olunmur
    })
    .select('*').single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ document: docRow, grandTotal, currency });
}

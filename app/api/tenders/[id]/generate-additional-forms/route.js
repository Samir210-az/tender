import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, PageBreak } from 'docx';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { buildForma5Lines, buildForma7Rows, buildForma3Rows, buildForma4Sections } from '@/lib/additionalForms';
import { generateAdditionalFormsPdf } from '@/lib/generateAdditionalFormsPdf';

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

  const { data: profile } = await db.from('company_profiles').select('*').eq('registration_id', regId).maybeSingle();
  if (!profile || !profile.legal_name) {
    return NextResponse.json({ error: 'Əvvəlcə şirkət profilini doldurun (/company)' }, { status: 400 });
  }
  const { data: projects } = await db.from('company_projects').select('*').eq('registration_id', regId).order('start_date', { ascending: false });
  const { data: equipment } = await db.from('company_equipment').select('*').eq('registration_id', regId).order('name');
  const { data: employees } = await db.from('company_employees').select('*').eq('registration_id', regId).order('full_name');

  const forma5Lines = buildForma5Lines({ profile });
  const forma7Rows = buildForma7Rows({ projects: projects || [] });
  const forma3Rows = buildForma3Rows({ equipment: equipment || [] });
  const forma4Sections = buildForma4Sections({
    employees: employees || [],
    companyName: profile.legal_name,
    companyAddress: profile.legal_address,
    contactPersonName: profile.authorized_rep_name,
  });

  // DOCX
  const forma3TableRows = [
    new TableRow({
      children: ['№', 'Avadanlığın adı/modeli', 'İstehsal ili', 'Yeri/məşğulluğu', 'Mülkiyyət', 'Mülkiyyətçi detalları'].map(
        (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16 })] })] })
      ),
    }),
    ...forma3Rows.map((r) => new TableRow({
      children: [String(r.no), r.name, String(r.year), r.location, r.ownership, r.ownerDetails].map(
        (v) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 16 })] })] })
      ),
    })),
  ];

  const forma7TableRows = [
    new TableRow({
      children: ['№', 'Tarix', 'Satınalan təşkilat', 'Müqavilənin predmeti', 'Bənzərlik təsviri', 'Məbləğ', 'Vəziyyət', 'Rol'].map(
        (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16 })] })] })
      ),
    }),
    ...forma7Rows.map((r) => new TableRow({
      children: [String(r.no), r.period, r.client, r.subject, r.similarity, r.value, r.status, r.role].map(
        (v) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 16 })] })] })
      ),
    })),
  ];

  const docxDoc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'FORMA 5 — Təchizatçı haqqında', heading: HeadingLevel.HEADING_1, spacing: { after: 150 } }),
        ...forma5Lines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 60 } })),

        new Paragraph({ text: '', spacing: { before: 300, after: 150 } }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ text: 'FORMA 3 — Texniki baza', heading: HeadingLevel.HEADING_1, spacing: { after: 150 } }),
        forma3Rows.length > 0
          ? new Table({ rows: forma3TableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
          : new Paragraph({ children: [new TextRun({ text: 'Şirkət profilində avadanlıq əlavə edilməyib.', italics: true })] }),

        new Paragraph({ text: '', spacing: { before: 300, after: 150 } }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ text: 'FORMA 4 — Əsas heyətin tərcümeyi-halı və bəyannaməsi', heading: HeadingLevel.HEADING_1, spacing: { after: 100 } }),
        ...(forma4Sections.length > 0
          ? [new Paragraph({ children: [new TextRun(`Təchizatçının adı: ${forma4Sections[0].companyName}`)], spacing: { after: 150 } })]
          : []),
        ...(forma4Sections.length > 0
          ? forma4Sections.flatMap((s, idx) => [
              ...(idx > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
              new Paragraph({ text: `${s.fullName} — ${s.position}`, heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 80 } }),
              new Paragraph({ children: [new TextRun({ text: s.tenderSpecificNote, italics: true, color: 'B45309' })], spacing: { after: 100 } }),
              new Paragraph({ children: [new TextRun({ text: 'Heyət barədə məlumat', bold: true })], spacing: { after: 60 } }),
              ...s.personLines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 40 } })),
              new Paragraph({ children: [new TextRun({ text: 'İş yeri barədə məlumat', bold: true })], spacing: { before: 100, after: 60 } }),
              ...s.employerLines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 40 } })),
              new Paragraph({ children: [new TextRun({ text: 'Peşəkar təcrübə', bold: true })], spacing: { before: 100, after: 60 } }),
              new Paragraph({ children: [new TextRun(s.experienceText)], spacing: { after: 100 } }),
              new Paragraph({ children: [new TextRun({ text: 'İltizam', bold: true })], spacing: { before: 100, after: 60 } }),
              ...s.declaration.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 60 } })),
              new Paragraph({ children: [new TextRun(`Namizədin adı və soyadı: ${s.fullName}    İmza: _______________    Tarix: _____________`)], spacing: { before: 100, after: 60 } }),
              new Paragraph({ children: [new TextRun('Təchizatçının səlahiyyətli nümayəndəsi: _______________________    İmza: _______________    Tarix: _____________')], spacing: { after: 200 } }),
            ])
          : [new Paragraph({ children: [new TextRun({ text: 'Şirkət profilində işçi əlavə edilməyib.', italics: true })] })]),

        new Paragraph({ text: '', spacing: { before: 300, after: 150 } }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ text: 'FORMA 7 — Oxşar işlər üzrə təcrübə', heading: HeadingLevel.HEADING_1, spacing: { after: 150 } }),
        forma7Rows.length > 0
          ? new Table({ rows: forma7TableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
          : new Paragraph({ children: [new TextRun({ text: 'Şirkət profilində analoji layihə əlavə edilməyib.', italics: true })] }),
      ],
    }],
  });
  const docxBuffer = await Packer.toBuffer(docxDoc);
  const docxFileName = `Forma-3-4-5-7-${Date.now()}.docx`;
  const docxPath = `${tenderId}/${docxFileName}`;
  const { error: docxUploadErr } = await db.storage.from('generated-documents').upload(docxPath, docxBuffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  if (docxUploadErr) return NextResponse.json({ error: `DOCX Storage xətası: ${docxUploadErr.message}` }, { status: 500 });

  // PDF
  let pdfPath = null, pdfFileName = null, pdfGenerationError = null;
  try {
    const pdfBuffer = await generateAdditionalFormsPdf({ forma5Lines, forma7Rows, forma3Rows, forma4Sections });
    pdfFileName = `Forma-3-4-5-7-${Date.now()}.pdf`;
    pdfPath = `${tenderId}/${pdfFileName}`;
    const { error: pdfUploadErr } = await db.storage.from('generated-documents').upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' });
    if (pdfUploadErr) { pdfGenerationError = pdfUploadErr.message; pdfPath = null; pdfFileName = null; }
  } catch (err) {
    pdfGenerationError = err.message;
  }

  const { data: docRow, error: dbErr } = await db
    .from('generated_documents')
    .insert({
      tender_id: tenderId, registration_id: regId, doc_type: 'additional_forms',
      file_path: docxPath, file_name: docxFileName,
      file_path_pdf: pdfPath, file_name_pdf: pdfFileName,
      pdf_generation_error: pdfGenerationError,
      verification_status: 'not_verified', // deterministik, AI generasiyası deyil
    })
    .select('*').single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ document: docRow });
}

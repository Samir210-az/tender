import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { completeJSON } from '@/lib/ai/provider';
import { buildCompanyContext } from '@/lib/prompts/compliance';
import { generateProposalPdf } from '@/lib/generatePdf';
import {
  PROPOSAL_SYSTEM_PROMPT,
  buildProposalUserPrompt,
  PROPOSAL_PROMPT_VERSION,
} from '@/lib/prompts/proposalGeneration';
import {
  VERIFICATION_SYSTEM_PROMPT,
  buildVerificationUserPrompt,
  VERIFICATION_PROMPT_VERSION,
} from '@/lib/prompts/finalVerification';
import { buildAddresseeLines, buildSignatureLines, buildFormaOneDeclaration, checkLetterheadCompleteness } from '@/lib/letterhead';
import { runDeterministicChecks } from '@/lib/deterministicChecks';

export const maxDuration = 120;

const REQ_CATEGORY_LABELS = {
  legal: 'Hüquqi', financial: 'Maliyyə', technical: 'Texniki', experience: 'Təcrübə',
  personnel: 'Personal', equipment: 'Avadanlıq', administrative: 'İnzibati', deadline: 'Son tarix',
};
const STATUS_LABELS = {
  compliant: 'Uyğundur', partially_compliant: 'Qismən uyğun', non_compliant: 'Uyğun deyil',
  missing: 'Məlumat yoxdur', not_applicable: 'Aidiyyatı yoxdur', needs_review: 'Yoxlanılmalıdır',
};
const SECTION_HEADINGS = {
  cover_letter: 'Örtük Məktubu',
  company_introduction: 'Şirkət Təqdimatı',
  compliance_statement: 'Uyğunluq Bəyanatı',
  closing: 'Nəticə',
};

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .select('*')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  if (tenderErr || !tender) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const { data: requirements } = await db
    .from('tender_requirements')
    .select('*')
    .eq('tender_id', tenderId);
  if (!requirements || requirements.length === 0) {
    return NextResponse.json({ error: 'Əvvəlcə sənədləri analiz edin' }, { status: 400 });
  }

  const [{ data: profile }, { data: projects }, { data: documents }] = await Promise.all([
    db.from('company_profiles').select('*').eq('registration_id', regId).maybeSingle(),
    db.from('company_projects').select('*').eq('registration_id', regId),
    db.from('company_documents').select('category').eq('registration_id', regId),
  ]);

  if (!profile || !profile.legal_name) {
    return NextResponse.json({ error: 'Əvvəlcə şirkət profilini doldurun (/company)' }, { status: 400 });
  }

  const companyContext = buildCompanyContext(profile, projects || [], documents || []);

  const byCategory = {};
  for (const r of requirements) {
    const cat = REQ_CATEGORY_LABELS[r.category] || 'Digər';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  }
  const requirementsSummary = Object.entries(byCategory)
    .map(([cat, reqs]) => {
      const lines = reqs.map((r) => `  - ${r.title}: ${STATUS_LABELS[r.status] || 'Yoxlanılmalıdır'}${r.compliance_evidence ? ` (${r.compliance_evidence})` : ''}`);
      return `${cat}:\n${lines.join('\n')}`;
    })
    .join('\n\n');

  // 1. Proposal mətnini generasiya et
  let aiResult;
  try {
    const systemPrompt = PROPOSAL_SYSTEM_PROMPT(profile.writing_tone || 'formal');
    const userPrompt = buildProposalUserPrompt({
      tenderName: tender.name,
      organization: tender.organization,
      companyContext,
      requirementsSummary,
      standardIntro: profile.standard_intro,
      standardConclusion: profile.standard_conclusion,
    });
    // Yaradıcı yazı üçün mötədil temperature (0.3) — hər generasiyada bir qədər
    // fərqli ifadə tərzi olsun deyə, amma 0.5 real risk yaratdı: ISO 27001
    // kimi olmayan sertifikatları "uydurma" ehtimalı artırdı (Verification
    // Engine bunu bir neçə dəfə tutdu). Dəqiqlik > üslub müxtəlifliyi.
    aiResult = await completeJSON(systemPrompt, userPrompt, { temperature: 0.3 });
  } catch (err) {
    return NextResponse.json({ error: `Mətn generasiyası xətası: ${err.message}` }, { status: 500 });
  }

  const sections = {
    cover_letter: aiResult.cover_letter || '',
    company_introduction: aiResult.company_introduction || '',
    compliance_statement: aiResult.compliance_statement || '',
    closing: aiResult.closing || '',
  };

  // 2. Final Verification — ikinci AI keçidi, mətni COMPANY DATA ilə tutuşdurur
  let verificationStatus = 'not_verified';
  let verificationIssues = null;
  let verificationError = null;
  try {
    await new Promise((r) => setTimeout(r, 2200)); // Groq RPM limitinə hörmət
    const verifyUserPrompt = buildVerificationUserPrompt({
      tenderName: tender.name,
      sections,
      companyContext,
      unresolvedRequirements: requirements.filter((r) =>
        ['missing', 'non_compliant', 'partially_compliant'].includes(r.status)
      ),
    });
    const verifyResult = await completeJSON(VERIFICATION_SYSTEM_PROMPT, verifyUserPrompt, { temperature: 0.1 });
    verificationIssues = verifyResult.issues || [];

    // Deterministik yoxlama — AI-nin qeyri-sabitliyindən (bir dəfə tutur,
    // bir dəfə tutmur) asılı olmayan, HƏMİŞƏ işləyən əlavə müdafiə qatı.
    const deterministicIssues = runDeterministicChecks({ sections, companyContext, projects: projects || [] });
    if (deterministicIssues.length > 0) {
      verificationIssues = [...verificationIssues, ...deterministicIssues];
    }

    const hasCritical = verificationIssues.some((i) => i.severity === 'critical');
    verificationStatus = verificationIssues.length === 0 ? 'passed' : 'issues_found';
    if (hasCritical) verificationStatus = 'issues_found';
  } catch (err) {
    // Verification uğursuz olsa belə, deterministik yoxlamanı yenə də işlət —
    // bu, Groq-a bağlı deyil, həmişə icra oluna bilər.
    verificationError = err.message;
    const deterministicIssues = runDeterministicChecks({ sections, companyContext, projects: projects || [] });
    if (deterministicIssues.length > 0) {
      verificationIssues = deterministicIssues;
      verificationStatus = 'issues_found';
    }
  }

  // 3. DOCX qurulması
  const addresseeLines = buildAddresseeLines({ tender });
  const signatureLines = buildSignatureLines({ profile });
  const formaOneDeclaration = buildFormaOneDeclaration({ tender });

  const docxDoc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'AI TƏRƏFİNDƏN YARADILIB — TƏQDİM ETMƏZDƏN ƏVVƏL MÜTLƏQ YOXLAYIN VƏ TƏSDİQLƏYİN', bold: true, color: 'C0392B', size: 18 })],
          spacing: { after: 300 },
        }),
        new Paragraph({ text: 'TEXNİKİ TƏKLİF', heading: HeadingLevel.TITLE, spacing: { after: 100 } }),
        new Paragraph({ text: tender.name, heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        ...addresseeLines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 60 } })),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        new Paragraph({ text: 'Bəyanat (FORMA 1)', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 150 } }),
        ...formaOneDeclaration.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 100 } })),

        ...Object.entries(sections).flatMap(([key, text]) => [
          new Paragraph({ text: SECTION_HEADINGS[key], heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
          ...textToParagraphs(text),
        ]),
        new Paragraph({ text: '', spacing: { before: 400, after: 100 } }),
        ...signatureLines.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 80 } })),
      ],
    }],
  });
  const docxBuffer = await Packer.toBuffer(docxDoc);
  const docxFileName = `Texniki-Teklif-${Date.now()}.docx`;
  const docxPath = `${tenderId}/${docxFileName}`;

  const { error: docxUploadErr } = await db.storage
    .from('generated-documents')
    .upload(docxPath, docxBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  if (docxUploadErr) return NextResponse.json({ error: `DOCX Storage xətası: ${docxUploadErr.message}` }, { status: 500 });

  // 4. PDF qurulması
  let pdfPath = null;
  let pdfFileName = null;
  let pdfGenerationError = null;
  try {
    const pdfBuffer = await generateProposalPdf({
      tenderName: tender.name,
      addresseeLines,
      signatureLines,
      formaOneDeclaration,
      sections: Object.entries(sections).map(([key, text]) => ({ heading: SECTION_HEADINGS[key], text })),
    });
    pdfFileName = `Texniki-Teklif-${Date.now()}.pdf`;
    pdfPath = `${tenderId}/${pdfFileName}`;
    const { error: pdfUploadErr } = await db.storage
      .from('generated-documents')
      .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' });
    if (pdfUploadErr) {
      pdfGenerationError = `Storage: ${pdfUploadErr.message}`;
      pdfPath = null;
      pdfFileName = null;
    }
  } catch (err) {
    pdfGenerationError = `${err.message}${err.stack ? ' | ' + err.stack.split('\n').slice(0, 3).join(' > ') : ''}`;
  }

  // 5. DB-yə yaz
  const { data: docRow, error: dbErr } = await db
    .from('generated_documents')
    .insert({
      tender_id: tenderId,
      registration_id: regId,
      doc_type: 'technical_proposal',
      file_path: docxPath,
      file_name: docxFileName,
      file_path_pdf: pdfPath,
      file_name_pdf: pdfFileName,
      pdf_generation_error: pdfGenerationError,
      ai_provider: 'groq',
      ai_model: 'openai/gpt-oss-120b',
      verification_status: verificationStatus,
      verification_issues: verificationIssues,
      verification_error: verificationError,
      verified_at: verificationStatus !== 'not_verified' ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({
    document: docRow,
    promptVersion: PROPOSAL_PROMPT_VERSION,
    verificationPromptVersion: VERIFICATION_PROMPT_VERSION,
    letterheadWarnings: checkLetterheadCompleteness({ tender, profile }),
  });
}

function textToParagraphs(text) {
  if (!text) return [new Paragraph({ text: '' })];
  return text.split(/\n\n+/).map((p) => new Paragraph({ children: [new TextRun(p.trim())], spacing: { after: 150 } }));
}

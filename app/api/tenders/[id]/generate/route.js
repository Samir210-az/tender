import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { completeJSON } from '@/lib/ai/provider';
import { buildCompanyContext } from '@/lib/prompts/compliance';
import {
  PROPOSAL_SYSTEM_PROMPT,
  buildProposalUserPrompt,
  PROPOSAL_PROMPT_VERSION,
} from '@/lib/prompts/proposalGeneration';

export const maxDuration = 120;

const REQ_CATEGORY_LABELS = {
  legal: 'Hüquqi', financial: 'Maliyyə', technical: 'Texniki', experience: 'Təcrübə',
  personnel: 'Personal', equipment: 'Avadanlıq', administrative: 'İnzibati', deadline: 'Son tarix',
};
const STATUS_LABELS = {
  compliant: 'Uyğundur', partially_compliant: 'Qismən uyğun', non_compliant: 'Uyğun deyil',
  missing: 'Məlumat yoxdur', not_applicable: 'Aidiyyatı yoxdur', needs_review: 'Yoxlanılmalıdır',
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
    aiResult = await completeJSON(systemPrompt, userPrompt);
  } catch (err) {
    return NextResponse.json({ error: `Mətn generasiyası xətası: ${err.message}` }, { status: 500 });
  }

  // DOCX qurulması
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'AI TƏRƏFİNDƏN YARADILIB — TƏQDİM ETMƏZDƏN ƏVVƏL MÜTLƏQ YOXLAYIN VƏ TƏSDİQLƏYİN', bold: true, color: 'C0392B', size: 18 })],
          spacing: { after: 300 },
        }),
        new Paragraph({ text: 'TEXNİKİ TƏKLİF', heading: HeadingLevel.TITLE, spacing: { after: 100 } }),
        new Paragraph({ text: tender.name, heading: HeadingLevel.HEADING_2, spacing: { after: 300 } }),

        new Paragraph({ text: 'Örtük Məktubu', heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
        ...textToParagraphs(aiResult.cover_letter),

        new Paragraph({ text: 'Şirkət Təqdimatı', heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
        ...textToParagraphs(aiResult.company_introduction),

        new Paragraph({ text: 'Uyğunluq Bəyanatı', heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
        ...textToParagraphs(aiResult.compliance_statement),

        new Paragraph({ text: 'Nəticə', heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
        ...textToParagraphs(aiResult.closing),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `Texniki-Teklif-${Date.now()}.docx`;
  const storagePath = `${tenderId}/${fileName}`;

  const { error: uploadErr } = await db.storage
    .from('generated-documents')
    .upload(storagePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  if (uploadErr) return NextResponse.json({ error: `Storage xətası: ${uploadErr.message}` }, { status: 500 });

  const { data: docRow, error: dbErr } = await db
    .from('generated_documents')
    .insert({
      tender_id: tenderId,
      registration_id: regId,
      doc_type: 'technical_proposal',
      file_path: storagePath,
      file_name: fileName,
      ai_provider: 'groq',
      ai_model: 'openai/gpt-oss-120b',
    })
    .select('*')
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ document: docRow, promptVersion: PROPOSAL_PROMPT_VERSION });
}

function textToParagraphs(text) {
  if (!text) return [new Paragraph({ text: '' })];
  return text.split(/\n\n+/).map((p) => new Paragraph({ children: [new TextRun(p.trim())], spacing: { after: 150 } }));
}

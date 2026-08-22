import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { completeJSON } from '@/lib/ai/provider';
import {
  COMPLIANCE_SYSTEM_PROMPT,
  buildComplianceUserPrompt,
  buildCompanyContext,
} from '@/lib/prompts/compliance';

export const maxDuration = 120;

const VALID_STATUSES = new Set([
  'compliant', 'partially_compliant', 'non_compliant',
  'missing', 'not_applicable', 'needs_review',
]);

// Bir dəfəyə neçə tələb göndərilsin (TPM limitinə uyğun)
const BATCH_SIZE = 8;

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .select('id')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  if (tenderErr || !tender) {
    return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });
  }

  const { data: requirements, error: reqErr } = await db
    .from('tender_requirements')
    .select('id, title, description, category, mandatory')
    .eq('tender_id', tenderId);
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  if (!requirements || requirements.length === 0) {
    return NextResponse.json({ error: 'Bu tender üçün tələb tapılmadı — əvvəlcə sənədləri analiz edin' }, { status: 400 });
  }

  const [{ data: profile }, { data: projects }, { data: documents }] = await Promise.all([
    db.from('company_profiles').select('*').eq('registration_id', regId).maybeSingle(),
    db.from('company_projects').select('*').eq('registration_id', regId),
    db.from('company_documents').select('category').eq('registration_id', regId),
  ]);

  const companyContext = buildCompanyContext(profile, projects || [], documents || []);

  // Tələbləri batch-lərə bölürük (Groq TPM limitinə görə)
  const batches = [];
  for (let i = 0; i < requirements.length; i += BATCH_SIZE) {
    batches.push(requirements.slice(i, i + BATCH_SIZE));
  }

  const allResults = [];
  try {
    for (let i = 0; i < batches.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 2200));
      const userPrompt = buildComplianceUserPrompt(batches[i], companyContext);
      const response = await completeJSON(COMPLIANCE_SYSTEM_PROMPT, userPrompt);
      if (Array.isArray(response.results)) {
        allResults.push(...response.results);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Compliance analiz xətası: ${err.message}` }, { status: 500 });
  }

  // Nəticələri DB-yə yaz
  let updated = 0;
  for (const r of allResults) {
    const status = VALID_STATUSES.has(r.status) ? r.status : 'needs_review';
    const { error: updateErr } = await db
      .from('tender_requirements')
      .update({
        status,
        compliance_evidence: r.evidence || null,
        compliance_note: r.note || null,
        compliance_checked_at: new Date().toISOString(),
      })
      .eq('id', r.requirement_id)
      .eq('tender_id', tenderId);
    if (!updateErr) updated++;
  }

  await db.from('tenders').update({ status: 'ready' }).eq('id', tenderId);

  // Tender Readiness Score hesablanması — yalnız mövcud data-dan, əlavə AI
  // çağırışı olmadan. Şəffaf düstur: kateqoriya üzrə (mandatory) tələblərin
  // neçə faizi "compliant"-dır.
  const { data: finalRequirements } = await db
    .from('tender_requirements')
    .select('category, mandatory, status')
    .eq('tender_id', tenderId);

  const { overallScore, breakdown } = computeReadinessScore(finalRequirements || []);

  await db
    .from('tenders')
    .update({ readiness_score: overallScore, readiness_breakdown: breakdown })
    .eq('id', tenderId);

  return NextResponse.json({
    success: true,
    totalRequirements: requirements.length,
    updated,
    readinessScore: overallScore,
    readinessBreakdown: breakdown,
  });
}

const CATEGORY_LABELS_AZ = {
  legal: 'Hüquqi', financial: 'Maliyyə', technical: 'Texniki', experience: 'Təcrübə',
  personnel: 'Personal', equipment: 'Avadanlıq', administrative: 'İnzibati', deadline: 'Son tarix',
};

/**
 * Tender Score — şəffaf, deterministik düstur (AI-nin "təsadüfi rəqəmi" deyil):
 * hər kateqoriya üzrə MƏCBURİ tələblərin neçə faizi "compliant"-dır.
 * "not_applicable" statuslu tələblər məxrəcdən çıxarılır (aidiyyatı olmayan
 * tələb hesaba mane olmasın deyə).
 */
function computeReadinessScore(requirements) {
  const mandatoryOnly = requirements.filter((r) => r.mandatory && r.status !== 'not_applicable');
  if (mandatoryOnly.length === 0) return { overallScore: null, breakdown: null };

  const byCategory = {};
  for (const r of mandatoryOnly) {
    const cat = r.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, compliant: 0 };
    byCategory[cat].total++;
    if (r.status === 'compliant') byCategory[cat].compliant++;
    else if (r.status === 'partially_compliant') byCategory[cat].compliant += 0.5;
  }

  const breakdown = {};
  let totalCompliant = 0;
  let totalCount = 0;
  for (const [cat, { total, compliant }] of Object.entries(byCategory)) {
    breakdown[CATEGORY_LABELS_AZ[cat] || cat] = Math.round((compliant / total) * 100);
    totalCompliant += compliant;
    totalCount += total;
  }

  const overallScore = Math.round((totalCompliant / totalCount) * 100);
  return { overallScore, breakdown };
}

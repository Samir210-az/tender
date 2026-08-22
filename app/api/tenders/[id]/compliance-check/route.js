import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { completeJSON } from '@/lib/ai/provider';
import { COMPLIANCE_SYSTEM_PROMPT, buildComplianceUserPrompt } from '@/lib/prompts/compliance';

export const maxDuration = 60;

const VALID_STATUSES = new Set(['compliant', 'non_compliant', 'missing', 'needs_review', 'not_applicable']);

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
  if (tenderErr || !tender) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const { data: requirements, error: reqErr } = await db
    .from('tender_requirements')
    .select('id, title, description, category, mandatory')
    .eq('tender_id', tenderId);
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  if (!requirements || requirements.length === 0) {
    return NextResponse.json({ error: 'Bu tender üçün tələb tapılmadı — əvvəlcə sənədləri analiz et' }, { status: 400 });
  }

  const { data: profile } = await db
    .from('company_profiles')
    .select('*')
    .eq('registration_id', regId)
    .maybeSingle();

  try {
    // Böyük tender-lərdə 20-yə qədər tələbi bir dəfəyə göndəririk (token limitinə görə)
    const BATCH_SIZE = 20;
    const allResults = [];
    for (let i = 0; i < requirements.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise((r) => setTimeout(r, 2200));
      const batch = requirements.slice(i, i + BATCH_SIZE);
      const userPrompt = buildComplianceUserPrompt(batch, profile);
      const response = await completeJSON(COMPLIANCE_SYSTEM_PROMPT, userPrompt);
      if (Array.isArray(response.results)) allResults.push(...response.results);
    }

    // Yalnız real, mövcud requirement_id-lərə uyğun nəticələri tətbiq et
    const requirementIds = new Set(requirements.map((r) => r.id));
    let updatedCount = 0;
    for (const res of allResults) {
      if (!requirementIds.has(res.requirement_id)) continue;
      const status = VALID_STATUSES.has(res.status) ? res.status : 'needs_review';
      await db
        .from('tender_requirements')
        .update({
          status,
          compliance_reasoning: res.reasoning || null,
          compliance_checked_at: new Date().toISOString(),
        })
        .eq('id', res.requirement_id);
      updatedCount++;
    }

    return NextResponse.json({ success: true, checked: updatedCount, total: requirements.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

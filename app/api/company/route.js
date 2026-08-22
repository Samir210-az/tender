import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_profiles')
    .select('*')
    .eq('registration_id', regId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data || null });
}

export async function PUT(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  const allowedFields = [
    'legal_name', 'voen', 'legal_address', 'description', 'sectors',
    'establishment_date', 'employee_count',
    'turnover_year1', 'turnover_year1_label', 'turnover_year2', 'turnover_year2_label',
    'writing_tone', 'standard_intro', 'standard_conclusion',
    'authorized_rep_name', 'authorized_rep_position',
  ];
  const payload = { registration_id: regId, updated_at: new Date().toISOString() };
  for (const f of allowedFields) {
    if (f in body) payload[f] = body[f] === '' ? null : body[f];
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_profiles')
    .upsert(payload, { onConflict: 'registration_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

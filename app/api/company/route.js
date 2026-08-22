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
  return NextResponse.json({ profile: data });
}

const EDITABLE_FIELDS = [
  'legal_name', 'voen', 'legal_address', 'phone', 'email',
  'founded_year', 'employee_count', 'annual_turnover_azn', 'description',
];

export async function PUT(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  const update = { registration_id: regId, updated_at: new Date().toISOString() };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field] === '' ? null : body[field];
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_profiles')
    .upsert(update, { onConflict: 'registration_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

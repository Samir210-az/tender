import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db.from('company_employees').select('*').eq('registration_id', regId).order('full_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data });
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  if (!body.full_name?.trim()) return NextResponse.json({ error: 'Ad soyad tələb olunur' }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db.from('company_employees').insert({
    registration_id: regId,
    full_name: body.full_name.trim(),
    position: body.position || null,
    birth_date: body.birth_date || null,
    address: body.address || null,
    phone: body.phone || null,
    email: body.email || null,
    professional_certificates: body.professional_certificates || null,
    education: body.education || null,
    languages: body.languages || null,
    work_experience: body.work_experience || null,
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

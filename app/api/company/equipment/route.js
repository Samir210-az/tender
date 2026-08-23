import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db.from('company_equipment').select('*').eq('registration_id', regId).order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data });
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Ad tələb olunur' }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db.from('company_equipment').insert({
    registration_id: regId,
    name: body.name.trim(),
    manufacturer: body.manufacturer || null,
    model: body.model || null,
    production_year: body.production_year || null,
    ownership_status: body.ownership_status || 'sexsi',
    location_status: body.location_status || 'bosda',
    owner_details: body.owner_details || null,
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

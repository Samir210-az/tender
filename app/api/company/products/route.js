import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_products')
    .select('*')
    .eq('registration_id', regId)
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Ad tələb olunur' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_products')
    .insert({
      registration_id: regId,
      name: body.name.trim(),
      unit: body.unit || 'ədəd',
      unit_price: body.unit_price || null,
      currency: body.currency || 'AZN',
      description: body.description || null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

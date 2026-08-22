import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function PATCH(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { productId } = await params;
  const body = await request.json();
  const allowed = ['name', 'unit', 'unit_price', 'currency', 'description'];
  const payload = {};
  for (const f of allowed) if (f in body) payload[f] = body[f];

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_products')
    .update(payload)
    .eq('id', productId)
    .eq('registration_id', regId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { productId } = await params;
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('company_products')
    .delete()
    .eq('id', productId)
    .eq('registration_id', regId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

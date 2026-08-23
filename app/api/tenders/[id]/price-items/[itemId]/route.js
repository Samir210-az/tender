import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

/**
 * itemId-nin FAKTİKİ olaraq bu regId-ə aid tenderin altında olduğunu yoxlayır.
 * İki addımlı yoxlama (embedded-join sintaksisi əvəzinə) — kodun digər
 * hissələrində artıq sınanmış, etibarlı pattern.
 */
async function verifyItemOwnership(db, itemId, tenderId, regId) {
  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .select('id')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  if (tenderErr || !tender) return false;

  const { data: item, error: itemErr } = await db
    .from('tender_price_items')
    .select('id')
    .eq('id', itemId)
    .eq('tender_id', tenderId)
    .single();
  return !itemErr && !!item;
}

function validatePriceFields(body) {
  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isFinite(q) || q <= 0) return 'Miqdar müsbət rəqəm olmalıdır';
  }
  if (body.unit_price !== undefined && body.unit_price !== null && body.unit_price !== '') {
    const p = Number(body.unit_price);
    if (!Number.isFinite(p) || p < 0) return 'Qiymət mənfi ola bilməz';
  }
  return null;
}

export async function PATCH(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId, itemId } = await params;
  const db = getSupabaseAdmin();

  const owns = await verifyItemOwnership(db, itemId, tenderId, regId);
  if (!owns) return NextResponse.json({ error: 'Sətir tapılmadı' }, { status: 404 });

  const body = await request.json();
  const validationError = validatePriceFields(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const allowed = ['description', 'unit', 'quantity', 'unit_price'];
  const payload = {};
  for (const f of allowed) if (f in body) payload[f] = body[f];

  const { data, error } = await db
    .from('tender_price_items')
    .update(payload)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId, itemId } = await params;
  const db = getSupabaseAdmin();

  const owns = await verifyItemOwnership(db, itemId, tenderId, regId);
  if (!owns) return NextResponse.json({ error: 'Sətir tapılmadı' }, { status: 404 });

  const { error } = await db.from('tender_price_items').delete().eq('id', itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

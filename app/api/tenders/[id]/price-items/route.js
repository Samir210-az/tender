import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

async function verifyTenderOwnership(db, tenderId, regId) {
  const { data, error } = await db.from('tenders').select('id').eq('id', tenderId).eq('registration_id', regId).single();
  return !error && !!data;
}

export async function GET(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();
  const owns = await verifyTenderOwnership(db, tenderId, regId);
  if (!owns) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const { data, error } = await db
    .from('tender_price_items')
    .select('*')
    .eq('tender_id', tenderId)
    .order('item_no', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// Avtomatik uyğunlaşdırma: sətir adı kataloqdakı məhsul adına bənzəyirsə,
// qiyməti oradan təklif edir (istifadəçi hələ də dəyişə bilər — heç vaxt
// məcburi tətbiq olunmur).
function suggestPrice(description, catalog) {
  const normalized = description.toLowerCase().trim();
  const exact = catalog.find((p) => p.name.toLowerCase().trim() === normalized);
  if (exact) return exact;
  const partial = catalog.find((p) =>
    normalized.includes(p.name.toLowerCase().trim()) || p.name.toLowerCase().trim().includes(normalized)
  );
  return partial || null;
}

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();
  const owns = await verifyTenderOwnership(db, tenderId, regId);
  if (!owns) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const body = await request.json();
  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'Təsvir tələb olunur' }, { status: 400 });
  }

  const { data: existing } = await db.from('tender_price_items').select('item_no').eq('tender_id', tenderId).order('item_no', { ascending: false }).limit(1);
  const nextItemNo = (existing?.[0]?.item_no || 0) + 1;

  let unitPrice = body.unit_price || null;
  let matchedProductId = null;

  if (!unitPrice) {
    const { data: catalog } = await db.from('company_products').select('*').eq('registration_id', regId);
    const suggestion = suggestPrice(body.description, catalog || []);
    if (suggestion) {
      unitPrice = suggestion.unit_price;
      matchedProductId = suggestion.id;
    }
  }

  const { data, error } = await db
    .from('tender_price_items')
    .insert({
      tender_id: tenderId,
      item_no: nextItemNo,
      description: body.description.trim(),
      unit: body.unit || 'ədəd',
      quantity: body.quantity || 1,
      unit_price: unitPrice,
      matched_product_id: matchedProductId,
      source: body.source || 'manual',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

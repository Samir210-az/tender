import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminPinServer } from '@/lib/adminPinServer';

const DAY = 24 * 60 * 60 * 1000;
const PLAN_DURATIONS = { monthly: 30 * DAY, yearly: 365 * DAY };

export async function GET(request) {
  const pin = request.headers.get('x-admin-pin');
  if (!verifyAdminPinServer(pin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registrations: data });
}

export async function POST(request) {
  const pin = request.headers.get('x-admin-pin');
  if (!verifyAdminPinServer(pin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, id } = await request.json();
  if (!id || !['approve', 'reject', 'extend', 'deactivate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: reg, error: fetchError } = await db
    .from('registrations')
    .select('plan, expires_at')
    .eq('id', id)
    .single();

  if (fetchError || !reg) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const duration = PLAN_DURATIONS[reg.plan] || PLAN_DURATIONS.monthly;

  let update = {};
  if (action === 'approve') {
    update = { status: 'active', approved_at: new Date().toISOString(), expires_at: new Date(Date.now() + duration).toISOString() };
  } else if (action === 'reject') {
    update = { status: 'rejected', rejected_at: new Date().toISOString() };
  } else if (action === 'extend') {
    const base = reg.expires_at && new Date(reg.expires_at).getTime() > Date.now() ? new Date(reg.expires_at).getTime() : Date.now();
    update = { status: 'active', expires_at: new Date(base + duration).toISOString() };
  } else if (action === 'deactivate') {
    // Aktiv abunəni dərhal dayandırır (məs. ödəniş problemi) — data qalır,
    // sonra "Təsdiqlə" ilə yenidən aktivləşdirilə bilər.
    update = { status: 'rejected', rejected_at: new Date().toISOString(), expires_at: new Date().toISOString() };
  }

  const { error: updateError } = await db.from('registrations').update(update).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const pin = request.headers.get('x-admin-pin');
  if (!verifyAdminPinServer(pin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id tələb olunur' }, { status: 400 });

  const db = getSupabaseAdmin();

  // CASCADE bütün tender/company data-nı da siləcək (schema-da on delete
  // cascade var) — ona görə bu, geri qaytarıla bilməz və UI-da təsdiq tələb edir.
  const { error } = await db.from('registrations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('tenders')
    .select('id, name, organization, deadline, status, readiness_score, created_at')
    .eq('registration_id', regId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenders: data });
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { name, organization, deadline } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Tender adı tələb olunur' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('tenders')
    .insert({
      registration_id: regId,
      name: name.trim(),
      organization: organization?.trim() || null,
      deadline: deadline || null,
      status: 'draft',
    })
    .select('id, name, organization, deadline, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tender: data });
}

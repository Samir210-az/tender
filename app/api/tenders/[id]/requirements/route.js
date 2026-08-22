import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .select('id')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  if (tenderErr || !tender) {
    return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });
  }

  const { data, error } = await db
    .from('tender_requirements')
    .select('*')
    .eq('tender_id', tenderId)
    .order('category', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requirements: data });
}

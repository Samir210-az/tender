import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_projects')
    .select('*')
    .eq('registration_id', regId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  if (!body.project_name?.trim()) {
    return NextResponse.json({ error: 'Layihə adı tələb olunur' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_projects')
    .insert({
      registration_id: regId,
      project_name: body.project_name.trim(),
      client_name: body.client_name || null,
      client_contact: body.client_contact || null,
      contract_value: body.contract_value || null,
      currency: body.currency || 'AZN',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      description: body.description || null,
      completion_status: body.completion_status || 'completed',
      supplier_role: body.supplier_role || 'Təchizatçı',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

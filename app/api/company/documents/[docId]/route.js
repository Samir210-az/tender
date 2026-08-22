import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function DELETE(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { docId } = await params;
  const db = getSupabaseAdmin();

  const { data: doc, error: fetchErr } = await db
    .from('company_documents')
    .select('file_path')
    .eq('id', docId)
    .eq('registration_id', regId)
    .single();
  if (fetchErr || !doc) return NextResponse.json({ error: 'Sənəd tapılmadı' }, { status: 404 });

  await db.storage.from('company-documents').remove([doc.file_path]);
  const { error } = await db.from('company_documents').delete().eq('id', docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

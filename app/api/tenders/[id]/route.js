import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

async function verifyTenderOwnership(db, tenderId, regId) {
  const { data, error } = await db
    .from('tenders')
    .select('id')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  return !error && !!data;
}

export async function GET(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const db = getSupabaseAdmin();

  const owns = await verifyTenderOwnership(db, id, regId);
  if (!owns) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const { data: tender, error: tenderError } = await db
    .from('tenders')
    .select('*')
    .eq('id', id)
    .single();

  const { data: documents, error: docsError } = await db
    .from('tender_documents')
    .select('id, file_name, file_size, mime_type, category, ocr_status, page_count, created_at')
    .eq('tender_id', id)
    .order('created_at', { ascending: false });

  if (tenderError || docsError) {
    return NextResponse.json({ error: (tenderError || docsError).message }, { status: 500 });
  }

  return NextResponse.json({ tender, documents });
}

export async function PATCH(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const db = getSupabaseAdmin();

  const owns = await verifyTenderOwnership(db, id, regId);
  if (!owns) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const body = await request.json();
  const allowedFields = ['name', 'organization', 'deadline', 'tender_number'];
  const payload = {};
  for (const f of allowedFields) {
    if (f in body) payload[f] = body[f] === '' ? null : body[f];
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Yenilənəcək sahə göndərilməyib' }, { status: 400 });
  }

  const { data, error } = await db
    .from('tenders')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tender: data });
}

export async function DELETE(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const db = getSupabaseAdmin();

  const owns = await verifyTenderOwnership(db, id, regId);
  if (!owns) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  // Storage-dəki bütün sənədləri də sil
  const { data: docs } = await db.from('tender_documents').select('file_path').eq('tender_id', id);
  if (docs?.length) {
    await db.storage.from('tender-documents').remove(docs.map((d) => d.file_path));
  }

  const { error } = await db.from('tenders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

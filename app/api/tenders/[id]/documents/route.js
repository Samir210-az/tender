import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/zip',
  'image/jpeg',
  'image/png',
]);

async function verifyTenderOwnership(db, tenderId, regId) {
  const { data, error } = await db
    .from('tenders')
    .select('id')
    .eq('id', tenderId)
    .eq('registration_id', regId)
    .single();
  return !error && !!data;
}

export async function POST(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const owns = await verifyTenderOwnership(db, tenderId, regId);
  if (!owns) return NextResponse.json({ error: 'Tender tapılmadı' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'Fayl göndərilməyib' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fayl 50MB-dan böyükdür' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Dəstəklənməyən fayl tipi: ${file.type}` }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9а-яА-Яəğıöüşç._-]/gi, '_');
  const storagePath = `${tenderId}/${Date.now()}-${safeName}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await db.storage
    .from('tender-documents')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Storage xətası: ${uploadError.message}` }, { status: 500 });
  }

  const { data: docRow, error: dbError } = await db
    .from('tender_documents')
    .insert({
      tender_id: tenderId,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      ocr_status: 'pending',
    })
    .select('id, file_name, file_size, mime_type, ocr_status, created_at')
    .single();

  if (dbError) {
    // Storage-ə yüklənib amma DB-yə yazıla bilməyibsə, orfan faylı silirik
    await db.storage.from('tender-documents').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ document: docRow });
}

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const VALID_CATEGORIES = new Set(['legal', 'financial', 'certificate', 'license', 'experience_reference', 'other']);

const AZ_TRANSLIT_MAP = {
  ə: 'e', Ə: 'E', ğ: 'g', Ğ: 'G', ı: 'i', I: 'I', İ: 'I',
  ö: 'o', Ö: 'O', ü: 'u', Ü: 'U', ş: 's', Ş: 'S', ç: 'c', Ç: 'C',
};

function transliterateToAscii(name) {
  const withoutExt = name.replace(/\.[^.]+$/, '');
  const ext = name.match(/\.[^.]+$/)?.[0] || '';
  const transliterated = withoutExt.split('').map((ch) => AZ_TRANSLIT_MAP[ch] ?? ch).join('');
  const asciiOnly = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return `${asciiOnly || 'file'}${ext}`;
}

export async function GET(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('company_documents')
    .select('id, category, doc_name, file_size, mime_type, issue_date, expiry_date, created_at')
    .eq('registration_id', regId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const formData = await request.formData();
  const file = formData.get('file');
  const category = formData.get('category');
  const expiryDate = formData.get('expiry_date') || null;

  if (!file) return NextResponse.json({ error: 'Fayl göndərilməyib' }, { status: 400 });
  if (!VALID_CATEGORIES.has(category)) return NextResponse.json({ error: 'Yanlış kateqoriya' }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fayl 50MB-dan böyükdür' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: `Dəstəklənməyən fayl tipi: ${file.type}` }, { status: 400 });

  const db = getSupabaseAdmin();
  const safeName = transliterateToAscii(file.name);
  const storagePath = `${regId}/${Date.now()}-${safeName}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await db.storage
    .from('company-documents')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: `Storage xətası: ${uploadError.message}` }, { status: 500 });

  const { data: docRow, error: dbError } = await db
    .from('company_documents')
    .insert({
      registration_id: regId,
      category,
      doc_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      expiry_date: expiryDate,
    })
    .select('id, category, doc_name, file_size, expiry_date, created_at')
    .single();

  if (dbError) {
    await db.storage.from('company-documents').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ document: docRow });
}

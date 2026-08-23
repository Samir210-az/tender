import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';
import { extractText } from '@/lib/ai/textExtraction';
import { completeJSON } from '@/lib/ai/provider';
import { completeJSONWithFile } from '@/lib/ai/gemini';
import { parseAzDate } from '@/lib/ai/parseDate';
import {
  TENDER_METADATA_SYSTEM_PROMPT,
  buildTenderMetadataUserPrompt,
} from '@/lib/prompts/tenderMetadataExtraction';

export const maxDuration = 60;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
  'image/jpeg', 'image/png',
]);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

const AZ_TRANSLIT_MAP = {
  ə: 'e', Ə: 'E', ğ: 'g', Ğ: 'G', ı: 'i', I: 'I', İ: 'I',
  ö: 'o', Ö: 'O', ü: 'u', Ü: 'U', ş: 's', Ş: 'S', ç: 'c', Ç: 'C',
};
function transliterateToAscii(name) {
  const withoutExt = name.replace(/\.[^.]+$/, '');
  const ext = name.match(/\.[^.]+$/)?.[0] || '';
  const t = withoutExt.split('').map((ch) => AZ_TRANSLIT_MAP[ch] ?? ch).join('');
  const ascii = t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return `${ascii || 'file'}${ext}`;
}

export async function POST(request) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const db = getSupabaseAdmin();
  const formData = await request.formData();
  const file = formData.get('file');
  const jurisdiction = formData.get('jurisdiction') || 'AZ';

  if (!file) return NextResponse.json({ error: 'Fayl göndərilməyib' }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fayl 50MB-dan böyükdür' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Dəstəklənməyən fayl tipi: ${file.type}` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isImage = IMAGE_TYPES.has(file.type);

  // 1. Metadata çıxarımı (mətn və ya vizual yolla)
  let metadata = { tender_name: null, organization: null, deadline: null, tender_number: null };
  try {
    if (isImage) {
      const base64 = buffer.toString('base64');
      metadata = await completeJSONWithFile(
        TENDER_METADATA_SYSTEM_PROMPT,
        buildTenderMetadataUserPrompt('', file.name),
        base64,
        file.type
      );
    } else {
      const extracted = await extractText(buffer, file.type, file.name);
      const looksScanned = !extracted.supported || !extracted.text || extracted.text.trim().length < 20;
      if (looksScanned && file.type === 'application/pdf') {
        const base64 = buffer.toString('base64');
        metadata = await completeJSONWithFile(
          TENDER_METADATA_SYSTEM_PROMPT,
          buildTenderMetadataUserPrompt('', file.name),
          base64,
          'application/pdf'
        );
      } else if (extracted.supported && extracted.text) {
        const userPrompt = buildTenderMetadataUserPrompt(extracted.text, file.name);
        metadata = await completeJSON(TENDER_METADATA_SYSTEM_PROMPT, userPrompt, { temperature: 0.1 });
      }
    }
  } catch (err) {
    // Metadata çıxarımı uğursuz olsa belə, tender-i boş sahələrlə yaradırıq —
    // istifadəçi özü doldura bilər, proses dayanmır.
    console.warn(`Metadata extraction xətası: ${err.message}`);
  }

  const parsedDeadline = metadata.deadline ? parseAzDate(metadata.deadline) : null;

  // 2. Tender yarat
  const { data: tender, error: tenderErr } = await db
    .from('tenders')
    .insert({
      registration_id: regId,
      name: metadata.tender_name?.trim() || file.name.replace(/\.[^.]+$/, ''),
      organization: metadata.organization?.trim() || null,
      deadline: parsedDeadline,
      tender_number: metadata.tender_number?.trim() || null,
      jurisdiction,
      status: 'draft',
    })
    .select('*')
    .single();
  if (tenderErr) return NextResponse.json({ error: tenderErr.message }, { status: 500 });

  // 3. Faylı Storage-ə yüklə və tender_documents-ə əlavə et
  const safeName = transliterateToAscii(file.name);
  const storagePath = `${tender.id}/${Date.now()}-${safeName}`;
  const { error: uploadErr } = await db.storage.from('tender-documents').upload(storagePath, buffer, { contentType: file.type });
  if (uploadErr) {
    return NextResponse.json({ tender, warning: `Tender yaradıldı, amma fayl yüklənmədi: ${uploadErr.message}` });
  }

  const { data: docRow } = await db
    .from('tender_documents')
    .insert({
      tender_id: tender.id,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      category: 'tender_notice',
    })
    .select('*')
    .single();

  return NextResponse.json({
    tender,
    document: docRow,
    metadataFound: {
      name: !!metadata.tender_name,
      organization: !!metadata.organization,
      deadline: !!parsedDeadline,
      tenderNumber: !!metadata.tender_number,
    },
  });
}

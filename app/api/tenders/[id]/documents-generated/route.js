import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireActiveRegistration } from '@/lib/requireActiveRegistration';

export async function GET(request, { params }) {
  const regId = request.headers.get('x-registration-id');
  const check = await requireActiveRegistration(regId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id: tenderId } = await params;
  const db = getSupabaseAdmin();

  const { data: docs, error } = await db
    .from('generated_documents')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('registration_id', regId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    (docs || []).map(async (d) => {
      const { data: signedDocx } = await db.storage
        .from('generated-documents')
        .createSignedUrl(d.file_path, 3600); // 1 saat etibarlı
      let pdfUrl = null;
      if (d.file_path_pdf) {
        const { data: signedPdf } = await db.storage
          .from('generated-documents')
          .createSignedUrl(d.file_path_pdf, 3600);
        pdfUrl = signedPdf?.signedUrl || null;
      }
      return { ...d, download_url: signedDocx?.signedUrl || null, download_url_pdf: pdfUrl };
    })
  );

  return NextResponse.json({ documents: withUrls });
}

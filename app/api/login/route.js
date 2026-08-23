import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createHash } from 'crypto';

/**
 * Telefon + PIN ilə mövcud qeydiyyatı tapır. Uğurlu olsa regId qaytarır —
 * client bunu localStorage-a yazıb sessiyanı bərpa edir.
 *
 * Təhlükəsizlik qeydi: "telefon tapılmadı" və "PIN səhvdir" arasında fərq
 * göstərmirik (eyni generic mesaj) ki, hücumçu mövcud telefon nömrələrini
 * "enumerate" edə bilməsin.
 */
export async function POST(request) {
  const { phone, pin } = await request.json();

  if (!phone?.trim() || !pin?.trim()) {
    return NextResponse.json({ error: 'Telefon və PIN tələb olunur' }, { status: 400 });
  }

  const pinHash = createHash('sha256').update(pin.trim()).digest('hex');
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from('registrations')
    .select('id, status, company_name')
    .eq('phone', phone.trim())
    .eq('pin_hash', pinHash)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Telefon və ya PIN səhvdir' }, { status: 401 });
  }

  return NextResponse.json({ regId: data.id, status: data.status, companyName: data.company_name });
}

import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * regId-in mövcud VƏ aktiv (status=active, müddəti bitməmiş) olduğunu
 * doğrulayır. Bütün tender API route-ları bu yoxlamadan keçməlidir —
 * əks halda gözləmədə/rədd edilmiş/bitmiş qeydiyyatlar tender yarada bilər.
 */
export async function requireActiveRegistration(regId) {
  if (!regId) {
    return { ok: false, error: 'regId göndərilməyib', status: 400 };
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('registrations')
    .select('id, status, expires_at, company_name')
    .eq('id', regId)
    .single();

  if (error || !data) {
    return { ok: false, error: 'Qeydiyyat tapılmadı', status: 404 };
  }

  if (data.status !== 'active') {
    return { ok: false, error: `Abunəlik aktiv deyil (status: ${data.status})`, status: 403 };
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Abunəlik müddəti bitib', status: 403 };
  }

  return { ok: true, registration: data };
}

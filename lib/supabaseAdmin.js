import { createClient } from '@supabase/supabase-js';

// XƏBƏRDARLIQ: bu fayl service_role key istifadə edir — RLS-i bypass edir.
// Yalnız server tərəfdə (app/api/**/route.js) import edilməlidir.
// 'use client' komponentlərində import edilərsə, key browser bundle-ına düşər.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

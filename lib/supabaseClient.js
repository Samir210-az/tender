import { createClient } from '@supabase/supabase-js';

let _client = null;

// Lazy singleton — modul import zamanı deyil, ilk çağırışda yaradılır.
// Bu, Next.js-in server tərəfdə prerender zamanı module-level kodu icra
// etməsindən qaynaqlanan build xətalarının qarşısını alır (bax: Firebase bug).
export function getSupabase() {
  if (!_client) {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    _client = createClient(url, key);
  }
  return _client;
}

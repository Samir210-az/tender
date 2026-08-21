// Universal SuperAdmin PIN: AL2026EA (bütün AN Psixoloji / SECURITY GROUP layihələrində eyni)
// PIN kodda açıq saxlanmır — yalnız SHA-256 hash müqayisə edilir.

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// sha256("AL2026EA") — Python hashlib ilə hesablanıb və doğrulanıb
const ADMIN_PIN_HASH = 'a0e517d37e8d21b24dc3b8aed38954353019618e2b2552b44bb55dddb52a7b15';

export async function verifyAdminPin(input) {
  const hash = await sha256(input.trim());
  return hash === ADMIN_PIN_HASH;
}

const SESSION_KEY = 'tender_admin_session';

export function setAdminSession() {
  sessionStorage.setItem(SESSION_KEY, String(Date.now()));
}

export function hasAdminSession() {
  return Boolean(sessionStorage.getItem(SESSION_KEY));
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// Universal SuperAdmin PIN: AL2026EA (bütün AN Psixoloji / SECURITY GROUP layihələrində eyni)
// Hash Python hashlib.sha256 ilə hesablanıb və Node crypto ilə çarpaz yoxlanılıb.
export const ADMIN_PIN_HASH = 'a0e517d37e8d21b24dc3b8aed38954353019618e2b2552b44bb55dddb52a7b15';

// Browser (Web Crypto API)
export async function verifyAdminPinBrowser(input) {
  const enc = new TextEncoder().encode(input.trim());
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hash === ADMIN_PIN_HASH;
}

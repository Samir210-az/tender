import { createHash } from 'crypto';
import { ADMIN_PIN_HASH } from './adminPinHash';

export function verifyAdminPinServer(input) {
  if (!input) return false;
  const hash = createHash('sha256').update(input.trim()).digest('hex');
  return hash === ADMIN_PIN_HASH;
}

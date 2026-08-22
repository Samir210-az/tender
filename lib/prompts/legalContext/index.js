import { AZ_LEGAL_CONTEXT, AZ_LEGAL_CONTEXT_VERSION } from './az';

/**
 * Jurisdiction registry — yeni ölkə əlavə etmək üçün:
 * 1. Bu qovluqda <code>.js faylı yarat (məs. uz.js) — az.js-dəki strukturu təqlid et
 * 2. Aşağıdakı map-ə əlavə et
 *
 * DİQQƏT: Yeni ölkə əlavə etməzdən əvvəl MÜTLƏQ web axtarışı ilə həmin
 * ölkənin qüvvədə olan satınalma qanununu doğrula. Heç vaxt hüquqi
 * məzmunu yoxlamadan uydurma.
 */
export const JURISDICTIONS = {
  AZ: {
    label: 'Azərbaycan',
    legalContext: AZ_LEGAL_CONTEXT,
    version: AZ_LEGAL_CONTEXT_VERSION,
    available: true,
  },
  UZ: { label: "Özbəkistan", legalContext: null, version: null, available: false },
  KZ: { label: 'Qazaxıstan', legalContext: null, version: null, available: false },
  TM: { label: 'Türkmənistan', legalContext: null, version: null, available: false },
  TJ: { label: 'Tacikistan', legalContext: null, version: null, available: false },
  KG: { label: 'Qırğızıstan', legalContext: null, version: null, available: false },
  TR: { label: 'Türkiyə', legalContext: null, version: null, available: false },
};

export function getLegalContext(jurisdiction) {
  const entry = JURISDICTIONS[jurisdiction];
  if (!entry || !entry.available) return null;
  return entry.legalContext;
}

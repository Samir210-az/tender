/**
 * Rəsmi FORMA reyestri — mənbə: Nazirlər Kabinetinin 30.12.2023 tarixli
 * № 503 Qərarı, 1 və 2 nömrəli əlavələr (İşlər / Mallar). Hər FORMA üçün:
 *  - capability: 'auto' (bizim sistem avtomatik hazırlayır),
 *                'manual_upload' (istifadəçi özü doldurub yükləməlidir,
 *                 çünki başqa tərəfin — bank/istehsalçı — imzası lazımdır),
 *                'not_built_yet' (planlaşdırılıb, hələ qurulmayıb)
 *  - conditional: yalnız müəyyən şərtdə lazımdır (birgə fəaliyyət/subpodratçı)
 */

const WORKS_FORMS = [
  { id: 'forma1', number: 1, name: 'Təklif məktubu', capability: 'auto' },
  { id: 'forma2', number: 2, name: 'İş həcmləri cədvəli', capability: 'auto' },
  { id: 'forma3', number: 3, name: 'Texniki baza', capability: 'not_built_yet' },
  { id: 'forma4', number: 4, name: 'Əsas heyətin tərcümeyi-halı və bəyannaməsi', capability: 'not_built_yet' },
  { id: 'forma5', number: 5, name: 'Təchizatçı haqqında', capability: 'auto' },
  { id: 'forma6', number: 6, name: 'Birgə fəaliyyət haqqında', capability: 'auto', conditional: 'joint_venture' },
  { id: 'forma7', number: 7, name: 'Oxşar işlər üzrə təcrübə', capability: 'auto' },
  { id: 'forma8', number: 8, name: 'Subpodratçılar haqqında məlumat', capability: 'not_built_yet', conditional: 'subcontractor' },
  { id: 'forma9', number: 9, name: 'Təklifin təminatı (bank zəmanəti)', capability: 'manual_upload' },
];

const GOODS_FORMS = [
  { id: 'forma1', number: 1, name: 'Təklif məktubu', capability: 'auto' },
  { id: 'forma2', number: 2, name: 'Qiymət cədvəli', capability: 'auto' },
  { id: 'forma3', number: 3, name: 'Təchizatçı haqqında', capability: 'auto' },
  { id: 'forma4', number: 4, name: 'Birgə fəaliyyət haqqında', capability: 'auto', conditional: 'joint_venture' },
  { id: 'forma5', number: 5, name: 'Oxşar malların göndərilməsi üzrə təcrübə', capability: 'auto' },
  { id: 'forma6', number: 6, name: 'Subpodratçılar haqqında məlumat', capability: 'not_built_yet', conditional: 'subcontractor' },
  { id: 'forma7', number: 7, name: 'Təklifin təminatı (bank zəmanəti)', capability: 'manual_upload' },
  { id: 'forma8', number: 8, name: 'İstehsalçının icazəsi', capability: 'manual_upload' },
];

// Xidmətlər (Services) üçün Qərarın 3 nömrəli əlavəsi mövcuddur, amma bu
// sessiyada ayrıca oxunmayıb — İşlər setinə bənzəyəcəyi ehtimal edilir,
// TƏSDİQLƏNMƏYİB. İstifadəçiyə bu qeyri-müəyyənlik açıq bildirilir.
const SERVICES_FORMS_UNVERIFIED = WORKS_FORMS;

// Bütün satınalma növlərinə aid, "Uyğunluq sənədləri" (11.1(f) bəndi) —
// bunlar HEÇ VAXT platforma tərəfindən yaradılmır, dövlət orqanlarından
// alınıb yüklənməlidir. Mövcud /company Sənədlər bölməsi buna xidmət edir.
const COMPLIANCE_CERTIFICATES = [
  'Vergi borcu olmaması arayışı (Dövlət Vergi Xidməti)',
  'Müflis olmama arayışı (Ədliyyə Nazirliyi)',
  'Məhkumluq arayışı (Daxili İşlər Nazirliyi)',
  'Fəaliyyət qadağası olmaması arayışı (Ədliyyə Nazirliyi)',
  'Lisenziya/icazə surəti (tələb olunarsa)',
];

export function getFormsForProcurementType(procurementType) {
  if (procurementType === 'goods') return GOODS_FORMS;
  if (procurementType === 'services') return SERVICES_FORMS_UNVERIFIED;
  return WORKS_FORMS; // default/naməlum halda ən çox rast gəlinən (İşlər) set göstərilir
}

export const CAPABILITY_LABELS = {
  auto: { label: 'Platforma hazırlayır', badgeClass: 'bg-emerald-500/15 text-emerald-400' },
  manual_upload: { label: 'Platforma HAZIRLAYA BİLMƏZ — özün əldə et', badgeClass: 'bg-red-500/15 text-red-400' },
  not_built_yet: { label: 'Hələ qurulmayıb (planlaşdırılıb)', badgeClass: 'bg-amber-500/15 text-amber-400' },
};

export { COMPLIANCE_CERTIFICATES };

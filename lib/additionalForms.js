/**
 * FORMA 5 (Təchizatçı haqqında) və FORMA 7 (Oxşar işlər üzrə təcrübə) —
 * hər ikisi TAM DETERMİNİSTİKDİR (AI istifadə olunmur). Yalnız
 * company_profiles və company_projects cədvəllərindəki mövcud faktları
 * rəsmi FORMA strukturuna köçürür. Uydurma riski yoxdur.
 */

export function buildForma5Lines({ profile }) {
  return [
    `Təchizatçının adı: ${profile.legal_name || '—'}`,
    `Təchizatçının qeydiyyat ölkəsi: Azərbaycan Respublikası`,
    `Təchizatçının təsis ili: ${profile.founded_year || '(Şirkət profilində doldurulmayıb)'}`,
    `Təchizatçının hüquqi və faktiki ünvanı: ${profile.legal_address || '(Şirkət profilində doldurulmayıb)'}`,
    '',
    'Təchizatçının səlahiyyətli nümayəndəsi haqqında:',
    `  Adı və soyadı: ${profile.authorized_rep_name || '(doldurulmayıb)'}`,
    `  Vəzifəsi: ${profile.authorized_rep_position || '(doldurulmayıb)'}`,
    `  Əlaqə nömrəsi: ${profile.phone || '(doldurulmayıb)'}`,
    `  E-poçt ünvanı: ${profile.email || '(doldurulmayıb)'}`,
  ];
}

const STATUS_LABELS = { completed: 'Tamamlanıb', ongoing: 'Davam edir' };

export function buildForma7Rows({ projects }) {
  return (projects || []).map((p, i) => ({
    no: i + 1,
    period: `${p.start_date || '?'} — ${p.end_date || 'davam edir'}`,
    client: `${p.client_name || '—'}${p.client_contact ? ` (${p.client_contact})` : ''}`,
    subject: p.project_name,
    similarity: p.description || '—',
    value: p.contract_value ? `${Number(p.contract_value).toLocaleString('az-AZ')} ${p.currency || 'AZN'}` : '—',
    status: STATUS_LABELS[p.completion_status] || 'Tamamlanıb',
    role: p.supplier_role || 'Təchizatçı',
  }));
}

/**
 * Hansı sahələr çatışmır — istifadəçiyə xəbərdarlıq üçün.
 */
export function checkForma5Completeness(profile) {
  const missing = [];
  if (!profile.founded_year) missing.push('Təsis ili');
  if (!profile.legal_address) missing.push('Hüquqi ünvan');
  if (!profile.authorized_rep_name) missing.push('İmzalayan şəxsin adı');
  if (!profile.phone) missing.push('Telefon');
  if (!profile.email) missing.push('E-poçt');
  return missing;
}

const OWNERSHIP_LABELS = { sexsi: 'Şəxsi', icare: 'İcarə', lizinq: 'Lizinq', xususi_istehsal: 'Xüsusi istehsal' };
const LOCATION_LABELS = { bosda: 'Boşda', istifadede: 'İstifadədə' };

/**
 * FORMA 3 (Texniki baza) — şirkət profilindəki avadanlıq siyahısından,
 * deterministik.
 */
export function buildForma3Rows({ equipment }) {
  return (equipment || []).map((e, i) => ({
    no: i + 1,
    name: `${e.name}${e.manufacturer ? ` (${e.manufacturer}${e.model ? ' ' + e.model : ''})` : ''}`,
    year: e.production_year || '—',
    location: LOCATION_LABELS[e.location_status] || 'Boşda',
    ownership: OWNERSHIP_LABELS[e.ownership_status] || 'Şəxsi',
    ownerDetails: e.owner_details || '—',
  }));
}

/**
 * FORMA 4 (Əsas heyətin tərcümeyi-halı) — şirkət profilindəki işçi
 * siyahısından, deterministik. Rəsmi FORMA 4 strukturuna tam uyğun:
 * heyət məlumatı + iş yeri məlumatı + təcrübə + İLTİZAM (bəyannamə,
 * imza xətləri ilə — sabit hüquqi mətn, AI yazmır).
 */
export function buildForma4Sections({ employees, companyName }) {
  return (employees || []).map((emp) => ({
    fullName: emp.full_name,
    position: emp.position || '(vəzifə göstərilməyib)',
    tenderSpecificNote: 'Məşğulluq dövrü və iş müddəti: (bu tender üçün konkret müəyyən ediləcək — hazırlanmış sənədə əl ilə əlavə edilməlidir)',
    personLines: [
      `Doğum tarixi: ${emp.birth_date || '—'}`,
      `Ünvan: ${emp.address || '—'}`,
      `Mobil nömrə: ${emp.phone || '—'}`,
      `E-poçt: ${emp.email || '—'}`,
      `Peşəkar sertifikatları: ${emp.professional_certificates || '—'}`,
      `Təhsili: ${emp.education || '—'}`,
      `Dil bilikləri: ${emp.languages || '—'}`,
    ],
    employerLines: [
      `İşəgötürənin adı: ${companyName || '—'}`,
      `Vəzifəsi: ${emp.position || '—'}`,
    ],
    experienceText: emp.work_experience || '(iş təcrübəsi doldurulmayıb)',
    declaration: [
      `Mən imza etməklə təsdiqləyirəm ki, bu FORMA 4-də verilən məlumatlar mənim ixtisasımı və təcrübəmi düzgün təsvir edir.`,
      `Mən başa düşürəm ki, bu Formada məlumatların yanlış verilməsi, gizlədilməsi və ya verilməməsi təklifin qiymətləndirilməsində nəzərə alınaraq satınalmadan uzaqlaşdırılmağa səbəb ola bilər.`,
    ],
  }));
}

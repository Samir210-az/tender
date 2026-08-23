/**
 * FORMA 3, 4, 5, 7 — Nazirlər Kabineti Qərarı № 503 (30.12.2023), IV Bölmə.
 * Bunların HEÇ BİRİ AI tərəfindən yazılmır — mövcud şirkət datası (company_profiles,
 * company_projects, company_equipment, company_employees) birbaşa rəsmi FORMA
 * strukturuna köçürülür. Uydurma riski yoxdur, çünki mətn generasiya olunmur,
 * yalnız mövcud sahələr formatlaşdırılır.
 */

// FORMA 5. Təchizatçı haqqında
export function buildForma5(profile) {
  return {
    heading: 'FORMA 5. Təchizatçı haqqında',
    lines: [
      `Təchizatçının adı: ${profile.legal_name || '(Şirkət profilində doldurulmayıb)'}`,
      `Təchizatçının qeydiyyat ölkəsi: Azərbaycan Respublikası`,
      `Təchizatçının hüquqi və faktiki ünvanı: ${profile.legal_address || '(doldurulmayıb)'}`,
      `Təchizatçının səlahiyyətli nümayəndəsi:`,
      `  Adı və soyadı: ${profile.authorized_rep_name || '(doldurulmayıb)'}`,
      `  Vəzifəsi: ${profile.authorized_rep_position || '(doldurulmayıb)'}`,
      `  VÖEN: ${profile.voen || '(doldurulmayıb)'}`,
    ],
  };
}

// FORMA 7. Oxşar işlər üzrə təcrübə (cədvəl)
export function buildForma7(projects) {
  const rows = (projects || []).map((p, i) => ({
    no: i + 1,
    dates: [p.start_date, p.end_date].filter(Boolean).join(' — ') || '(tarix qeyd edilməyib)',
    client: p.client_name || '(müştəri qeyd edilməyib)',
    subject: p.project_name,
    description: p.description || '(təsvir qeyd edilməyib)',
    amount: p.contract_value ? `${p.contract_value} ${p.currency || 'AZN'}` : '(məbləğ qeyd edilməyib)',
  }));
  return {
    heading: 'FORMA 7. Oxşar işlər üzrə təcrübə',
    columns: ['№', 'Tarix', 'Satınalan təşkilat', 'Müqavilənin predmeti', 'Təsvir', 'Məbləğ'],
    rows,
  };
}

// FORMA 3. Texniki baza (cədvəl)
export function buildForma3(equipment) {
  const OWNERSHIP_LABELS = { sexsi: 'Şəxsi', icare: 'İcarə', lizinq: 'Lizinq', xususi_istehsal: 'Xüsusi istehsal' };
  const LOCATION_LABELS = { istifadede: 'İstifadədə', bosda: 'Boşda' };
  const rows = (equipment || []).map((e, i) => ({
    no: i + 1,
    name: `${e.name}${e.manufacturer ? `, ${e.manufacturer}` : ''}${e.model ? ` ${e.model}` : ''}`,
    year: e.production_year || '—',
    location: LOCATION_LABELS[e.location_status] || '—',
    owner: OWNERSHIP_LABELS[e.ownership_status] || '—',
    ownerDetails: e.owner_details || (e.ownership_status === 'sexsi' ? '—' : '(doldurulmayıb)'),
  }));
  return {
    heading: 'FORMA 3. Texniki baza',
    columns: ['№', 'Avadanlığın adı, istehsalçısı və modeli', 'İstehsal ili', 'Hazırkı yeri', 'Mülkiyyətçi', 'Mülkiyyətçinin təfərrüatları'],
    rows,
  };
}

// FORMA 4. Təklif edilən əsas heyətin tərcümeyi-halı və bəyannaməsi (hər işçi üçün ayrıca səhifə)
export function buildForma4(employee, profile) {
  return {
    heading: 'FORMA 4. Təklif edilən əsas heyətin tərcümeyi-halı və bəyannaməsi',
    lines: [
      `Təchizatçının adı: ${profile?.legal_name || '(doldurulmayıb)'}`,
      `Təklif edilən namizədin vəzifəsi: ${employee.position || '(doldurulmayıb)'}`,
      '',
      'HEYƏT BARƏDƏ MƏLUMAT',
      `Ad və soyad: ${employee.full_name}`,
      `Doğum tarixi: ${employee.birth_date || '(doldurulmayıb)'}`,
      `Ünvan: ${employee.address || '(doldurulmayıb)'}`,
      `Telefon: ${employee.phone || '(doldurulmayıb)'}`,
      `E-poçt: ${employee.email || '(doldurulmayıb)'}`,
      `Peşəkar sertifikatlar: ${employee.professional_certificates || '(doldurulmayıb)'}`,
      `Təhsil: ${employee.education || '(doldurulmayıb)'}`,
      `Dil bilikləri: ${employee.languages || '(doldurulmayıb)'}`,
      '',
      'İŞ TƏCRÜBƏSİ',
      employee.work_experience || '(doldurulmayıb)',
      '',
      'İLTİZAM',
      'Mən imza etməklə təsdiqləyirəm ki, bu Formada verilən məlumatlar mənim ixtisasımı və təcrübəmi düzgün təsvir edir.',
    ],
  };
}

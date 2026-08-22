/**
 * FORMA 1 (Təklif məktubu) rəsmi strukturuna uyğun ünvanlayıcı və imza bloku
 * mətnləri qurur. Mənbə: Azərbaycan Respublikası Nazirlər Kabinetinin
 * 30.12.2023 tarixli 503 nömrəli Qərarı, 1 nömrəli əlavə, IV Bölmə, FORMA 1.
 *
 * DİQQƏT: Bu, hüquqi məsləhət deyil, rəsmi formanın strukturuna vizual/məzmun
 * uyğunlaşdırmadır. Real tender öz FORMA-sını tələb edirsə (fərqli ola bilər),
 * istifadəçi mütləq öz tender sənədindəki konkret formanı yoxlamalıdır.
 */
export function buildAddresseeLines({ tender }) {
  const today = new Date().toLocaleDateString('az-AZ');
  const lines = [`Təklifin təqdim olunma tarixi: ${today}`];
  if (tender.tender_number) {
    lines.push(`Müsabiqə/Tender nömrəsi: ${tender.tender_number}`);
  }
  lines.push(`Kimə: ${tender.organization || '(satınalan təşkilatın adı — tender yaradarkən daxil edilməyib)'}`);
  return lines;
}

export function buildSignatureLines({ profile }) {
  const today = new Date().toLocaleDateString('az-AZ');
  return [
    `Təchizatçının adı: ${profile.legal_name || '—'}`,
    `Təchizatçının VÖEN-i: ${profile.voen || '—'}`,
    `İmzalamaq səlahiyyəti olan şəxsin adı və soyadı: ${profile.authorized_rep_name || '(Şirkət profilində doldurulmayıb)'}`,
    `Vəzifəsi: ${profile.authorized_rep_position || '(Şirkət profilində doldurulmayıb)'}`,
    `İmza: _______________________`,
    `İmzalanma tarixi: ${today}`,
  ];
}

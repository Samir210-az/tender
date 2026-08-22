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
  lines.push(`Kimə: ${tender.organization || '_______________________________'}`);
  return lines;
}

export function buildSignatureLines({ profile }) {
  const today = new Date().toLocaleDateString('az-AZ');
  return [
    `Təchizatçının adı: ${profile.legal_name || '_______________________________'}`,
    `Təchizatçının VÖEN-i: ${profile.voen || '_______________________________'}`,
    `İmzalamaq səlahiyyəti olan şəxsin adı və soyadı: ${profile.authorized_rep_name || '_______________________________'}`,
    `Vəzifəsi: ${profile.authorized_rep_position || '_______________________________'}`,
    `İmza: _______________________________`,
    `İmzalanma tarixi: ${today}`,
  ];
}

/**
 * Generasiyadan əvvəl vacib sahələrin doldurulub-doldurulmadığını yoxlayır —
 * boş sahə real sənəddə görünmür (bax yuxarı), amma istifadəçi UI-da
 * xəbərdar olmalıdır ki, sənədi tamamlamaq üçün nə lazımdır.
 */
export function checkLetterheadCompleteness({ tender, profile }) {
  const missing = [];
  if (!tender.organization) missing.push('Satınalan təşkilatın adı (tender yaradılışında)');
  if (!profile.authorized_rep_name) missing.push('İmzalayan şəxsin adı (Şirkət profili)');
  if (!profile.authorized_rep_position) missing.push('İmzalayan şəxsin vəzifəsi (Şirkət profili)');
  return missing;
}

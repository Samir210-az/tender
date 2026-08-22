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

/**
 * FORMA 1-in ƏSAS HİSSƏSİ — rəsmi nömrələnmiş bəyanat bəndləri (a-j).
 * Bu, AI tərəfindən YAZILMIR — sabit hüquqi mətndir, birbaşa rəsmi formadan
 * (NK Qərarı № 503, 30.12.2023, 1 saylı əlavə, FORMA 1) götürülüb, yalnız
 * satınalma predmeti (tender adı) dəyişən kimi doldurulur. Deterministik
 * olduğu üçün heç bir hallucination riski daşımır.
 */
export function buildFormaOneDeclaration({ tender }) {
  const predmet = tender.name || '(satınalma predmeti)';
  return [
    'Biz, aşağıda imza edənlər bəyan edirik ki:',
    '(a) qeyd-şərtin olmaması: Təlimatın 8-ci hissəsinə müvafiq olaraq verilmiş əlavə və dəyişikliklər də daxil olmaqla (mövcud olduğu halda) şərtlər toplusu və onu təşkil edən sənədlər ilə tanış olduq, burada təsvir olunan işin görülməsi haqqında tam məlumata malikik və bu sənədlərə heç bir qeyd-şərtimiz yoxdur;',
    '(b) münasiblik: Təlimatın 3-cü hissəsində qeyd edilmiş tələblərə cavab veririk və maraqların toqquşması hallarının olmadığını təsdiqləyirik;',
    `(c) uyğunluq: Biz "${predmet}" şərtlər toplusunun tələblərinə və nəzərdə tutulmuş icra qrafikinə uyğun olaraq yerinə yetirməyi təklif edirik;`,
    '(d) qiymət: Tələb olunan işləri bütün vergi və rüsumlar daxil olmaqla dövlət satınalmalarının vahid internet Portalında göstərilən məbləğdə yerinə yetirməyi təklif edirik;',
    '(e) təklifin qüvvədə olma müddəti: Təklifimiz dövlət satınalmalarının vahid internet Portalında göstərilən tarixə qədər qüvvədədir, bizim üçün məcburi xarakter daşıyır və bu müddətin bitməsindən öncə istənilən vaxt qəbul edilə bilər;',
    '(f) icra təminatı: Bizim təklifimiz qəbul edildiyi təqdirdə şərtlər toplusunda qeyd edilən şərtlərdə icra təminatını təqdim edəcəyimizi öhdəmizə götürürük;',
    '(g) hər təchizatçı bir təklif: Biz fərdi təchizatçı kimi hər hansı digər təklif və ya təkliflər təqdim etmirik, birgə fəaliyyət üzvü və ya subpodratçı kimi hər hansı digər satınalma və ya satınalmalarda iştirak etmirik;',
    '(h) qəbul etmək məcburiyyətinin olmaması: Başa düşürük ki, siz ən aşağı qiyməti olan, ən səmərəli və ya digər istənilən təklifi qəbul etmək məcburiyyətində deyilsiniz;',
    '(i) əmlakdan sərbəst istifadə: Müqavilənin icrası zamanı istifadə olunacaq əmlaklardan (daşınmaz əmlak və nəqliyyat vasitələri istisna olmaqla) sərbəst və məhdudiyyətsiz istifadə etmək hüququmuz var;',
    '(j) saxtakarlıq və korrupsiya: Bizim üçün və ya bizim adımızdan hərəkət edən heç kimin heç bir formada saxtakarlıq və korrupsiya əməlləri törətməməsi üçün müvafiq tədbirləri görmüşük.',
  ];
}

/**
 * FORMA 2 (İş həcmləri cədvəli) rəsmi Preambulası — sabit hüquqi mətn,
 * birbaşa NK Qərarı № 503-ün IV Bölmə, FORMA 2-dən (A. Preambula).
 * AI yazmır, deterministikdir.
 */
export function buildFormaTwoPreamble() {
  return [
    'İş həcmləri cədvəli Təchizatçılar üçün təlimatlar (o cümlədən Satınalma məlumat vərəqi), Müqavilə, İşlərə dair tələblər sənədi (o cümlədən çertyojlar) ilə birlikdə oxunmalıdır.',
    'İş həcmləri cədvəlində verilmiş miqdarlar təxmini və şərtidir və cari satınalma predmeti ilə bağlı ümumi təsəvvür yaratmaq üçün verilmişdir. Ödənişin əsasını təchizatçı tərəfindən ölçülən, satınalan təşkilat tərəfindən yoxlanılan faktiki miqdarlar və qiymət daxil edilmiş iş həcmləri cədvəlində müəyyən olunan vahid qiymətlər təşkil edəcəkdir.',
    'İşin və materialların detallı təsvirləri iş həcmləri cədvəlinə daxil edilməmiş ola bilər. İş həcmləri cədvəlinin hər bir bəndi üzrə qiymətlər daxil edilməzdən əvvəl müqavilə sənədlərinin müvafiq bölmələrinə istinad edilməlidir.',
    'İş həcmləri cədvəlindəki maddələr işin xarakteristikasına və icra vaxtına görə qruplaşdırıla bilər.',
    'Ödəniş üçün tamamlanmış işin ölçülməsi üsulu uyğun olmalıdır.',
  ];
}

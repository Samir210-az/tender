/**
 * AI-əsaslı Verification Engine-ə əlavə (onu əvəz etmir) — AI-nin
 * "unudduğu" hallarda belə HƏMİŞƏ tutulan, sırf kod məntiqi ilə işləyən
 * yoxlamalar. Bunlar Groq-un qeyri-sabitliyindən (eyni prompt fərqli
 * nəticə verə bilər) asılı deyil.
 */

// Tez-tez uydurulan sertifikat/standart adları — mətndə keçirsə, amma
// COMPANY DATA-da yoxdursa, KRİTİK sayılır.
const CERT_PATTERNS = [
  /ISO\s*\d{3,5}/gi,
  /HACCP/gi,
  /OHSAS\s*\d{3,5}/gi,
  /CE\s+sertifikat/gi,
];

export function checkFabricatedCertifications(sectionsText, companyContext) {
  const issues = [];
  const normalizedContext = companyContext.toLowerCase();
  const found = new Set();

  for (const pattern of CERT_PATTERNS) {
    const matches = sectionsText.matchAll(pattern);
    for (const m of matches) {
      const term = m[0].trim();
      const key = term.toLowerCase().replace(/\s+/g, ' ');
      if (found.has(key)) continue;
      found.add(key);
      if (!normalizedContext.includes(key)) {
        issues.push({
          type: 'UNSUPPORTED_CLAIM',
          severity: 'critical',
          description: `Mətndə "${term}" adlı sertifikat/standart qeyd olunur, lakin COMPANY DATA-da belə sertifikat yoxdur (deterministik yoxlama).`,
          location: 'avtomatik aşkarlanıb',
        });
      }
    }
  }
  return issues;
}

/**
 * Şirkət layihələrindən hər hansı biri gələcək tarixli "tamamlanma" tarixinə
 * malikdirsə və proposal mətnində "tamamlanmışdır" kimi təqdim olunubsa,
 * bunu deterministik olaraq tapır (AI-nin tarix riyaziyyatını hər dəfə
 * düzgün etməsinə güvənmədən).
 */
export function checkFutureCompletionDates(sectionsText, projects) {
  const issues = [];
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, saat nəzərə alınmır

  for (const p of projects || []) {
    if (!p.end_date) continue;
    const endDateStr = typeof p.end_date === 'string' ? p.end_date.slice(0, 10) : new Date(p.end_date).toISOString().slice(0, 10);
    if (endDateStr < todayStr) continue; // yalnız KEÇMİŞ tarixlər problemsizdir — bu gün də daxil olmaqla gələcək şübhəlidir

    // Layihə adı mətndə keçir və "tamamla/bitmiş" kimi söz yaxınlığındadırsa
    const projectNameEscaped = p.project_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionRegex = new RegExp(`${projectNameEscaped}[^.]{0,150}(tamamlan|bitmiş|başa çat)`, 'i');
    if (mentionRegex.test(sectionsText)) {
      issues.push({
        type: 'WRONG_DATE',
        severity: 'high',
        description: `"${p.project_name}" layihəsinin tamamlanma tarixi (${p.end_date}) gələcəkdədir, lakin mətn onu tamamlanmış kimi təqdim edir (deterministik yoxlama). Bu, "Baba Dağ" test datası kimi Şirkət Profilində səhv daxil edilmiş tarix ola bilər — /company-də düzəlt.`,
        location: 'avtomatik aşkarlanıb',
      });
    }
  }
  return issues;
}

export function runDeterministicChecks({ sections, companyContext, projects }) {
  const sectionsText = Object.values(sections).join('\n\n');
  return [
    ...checkFabricatedCertifications(sectionsText, companyContext),
    ...checkFutureCompletionDates(sectionsText, projects),
  ];
}

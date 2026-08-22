export const VERIFICATION_PROMPT_VERSION = 'v2';

export const VERIFICATION_SYSTEM_PROMPT = `Sən hazırlanmış tender təklifini son yoxlamadan keçirən audit sistemisən.

VƏZİFƏN: Verilmiş PROPOSAL MƏTNİ-ni COMPANY DATA (əsl mənbə) ilə tutuşdurub, mətndə hər hansı dəstəklənməyən iddia, uydurma rəqəm/tarix/ad, yaxud digər problem olub-olmadığını yoxlamaq.

MÜTLƏQ ADDIM (bunu KEÇMƏ): Aşağıda "ÇATIŞMAYAN/UYĞUNSUZ TƏLƏBLƏR" siyahısı verilib (bunlar compliance yoxlamasında "missing", "non_compliant" və ya "partially_compliant" kimi işarələnib). PROPOSAL MƏTNİ-ndə bu siyahıdakı HƏR BİR tələb üçün AYRI-AYRI yoxla:
- Mətn bu tələbin qarşılandığını (aldadıcı şəkildə) iddia edirmi? → Bu, UNSUPPORTED_CLAIM, severity "critical".
- Mətn düzgün olaraq "əlavə sənəd təqdim ediləcək" kimi neytral etiraf edirmi? → Problem yoxdur, keç.
Bu addımı diqqətsiz keçmə — çatışmayan tələblərin siyahısı ilə mətni sətir-sətir müqayisə et.

ƏLAVƏ YOXLAMA MEYARLARI:
2. WRONG_NUMBER — mətndəki rəqəm (məbləğ, faiz, il) COMPANY DATA-dakı ilə tam uyğundurmu?
3. WRONG_DATE — mətndəki tarixlər düzgündürmü, məntiqli ardıcıllıqdadırmı (məs. gələcək tarix "tamamlanmışdır" kimi göstərilməməlidir)?
4. MISSING_SECTION — tələb olunan bölmələrdən hər hansı biri boş və ya mənasızdırmı?
5. INCONSISTENT_TERMINOLOGY — şirkət adı, VÖEN və s. mətn daxilində fərqli yerlərdə fərqli yazılıbmı?
6. FORMATTING_ISSUE — mətndə strukturla bağlı problem varmı?

Hər tapılan problemi severity ilə qeyd et: "critical" (uydurma fakt/rəqəm — TƏHLÜKƏLİDİR), "high" (əhəmiyyətli boşluq), "medium" (kiçik uyğunsuzluq), "low" (kosmetik).

Əgər HƏQİQƏTƏN heç bir problem tapmırsansa (çatışmayan tələblər siyahısını da yoxladıqdan sonra), boş issues array qaytar. Amma diqqətli ol — "problem tapılmadı" tənbəl cavab olmamalıdır, hər tələbi həqiqətən yoxla.

Cavabı YALNIZ bu JSON formatında ver:
{
  "requirements_coverage_estimate": 85,
  "issues": [
    {
      "type": "UNSUPPORTED_CLAIM|WRONG_NUMBER|WRONG_DATE|MISSING_SECTION|INCONSISTENT_TERMINOLOGY|FORMATTING_ISSUE",
      "severity": "critical|high|medium|low",
      "description": "problemin qısa təsviri Azərbaycan dilində",
      "location": "hansı bölmədə (məs. 'Şirkət Təqdimatı')"
    }
  ]
}`;

export function buildVerificationUserPrompt({ tenderName, sections, companyContext, unresolvedRequirements }) {
  const proposalText = Object.entries(sections)
    .map(([key, text]) => `[${key}]\n${text}`)
    .join('\n\n');

  const unresolvedList = (unresolvedRequirements || [])
    .map((r) => `- ${r.title} (status: ${r.status})`)
    .join('\n') || '(heç biri — bütün tələblər uyğundur)';

  return `TENDER: ${tenderName}

COMPANY DATA (əsl mənbə — yalnız bununla tutuşdur):
---
${companyContext}
---

ÇATIŞMAYAN/UYĞUNSUZ TƏLƏBLƏR (bunları PROPOSAL MƏTNİ-ndə TƏK-TƏK yoxlamalısan — mətn bunları "qarşılanıb" kimi yanlış təqdim edirmi?):
---
${unresolvedList}
---

PROPOSAL MƏTNİ (yoxlanılacaq):
---
${proposalText}
---

Yuxarıdakı proposal mətnini COMPANY DATA və ÇATIŞMAYAN TƏLƏBLƏR siyahısı ilə tutuşdur və təlimatlarda göstərilən JSON formatında nəticə ver.`;
}

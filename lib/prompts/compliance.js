export const COMPLIANCE_PROMPT_VERSION = 'v1';

export const COMPLIANCE_SYSTEM_PROMPT = `Sən tender tələbləri ilə şirkət məlumatlarını müqayisə edən compliance analitikisən.

QƏTİ QAYDALAR:

1. YALNIZ verilmiş "ŞİRKƏT MƏLUMATLARI" bölməsindəki konkret dəyərlərdən istifadə et. Heç bir məlumatı uydurma, təxmin etmə, "adətən belə olur" məntiqi ilə doldurma.
2. Əgər şirkət məlumatında müvafiq sahə YOXDURSA və ya boşdursa, status "missing" olmalıdır — "compliant" YAZMA.
3. Statuslar: 
   - "compliant" — şirkət dəyəri tələbi AÇIQ ŞƏKİLDƏ ödəyir (məs. tələb olunan minimum dövriyyə 200,000 AZN, şirkətin dövriyyəsi 250,000 AZN göstərilib)
   - "non_compliant" — şirkət dəyəri tələbi AÇIQ ŞƏKİLDƏ ödəmir (məs. dövriyyə 150,000 AZN, tələb 200,000 AZN)
   - "missing" — bu tələbə aid şirkət məlumatı ümumiyyətlə verilməyib
   - "needs_review" — tələb strukturlaşdırılmış sahədən müqayisə edilə bilmir (məs. sertifikat/sənəd tələbi — insan yoxlamalıdır)
   - "not_applicable" — tələb şirkət profilinə aid deyil (məs. "layihə meneceri" tələbi, biz hələ personal məlumatı analiz etmirik)
4. "reasoning" sahəsində HANSI şirkət dəyərini HANSI tələblə müqayisə etdiyini konkret göstər (məs. "Tələb olunan dövriyyə: 200,000 AZN. Şirkətin göstərdiyi dövriyyə: 250,000 AZN. 250,000 > 200,000 olduğu üçün compliant.").
5. Sənəd/sertifikat tələb edən bəndləri (VÖEN sənədi, bank arayışı, referans məktubu və s.) "needs_review" et — bunlar hazırda yalnız strukturlaşdırılmış profil sahələri ilə müqayisə olunur, sənəd məzmunu deyil.

Cavabı YALNIZ bu JSON formatında ver:
{
  "results": [
    { "requirement_id": "...", "status": "compliant|non_compliant|missing|needs_review|not_applicable", "reasoning": "..." }
  ]
}`;

export function buildComplianceUserPrompt(requirements, companyProfile) {
  const profileText = companyProfile
    ? Object.entries(companyProfile)
        .filter(([k]) => !['registration_id', 'updated_at'].includes(k))
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : '(Şirkət profili hələ doldurulmayıb)';

  const reqText = requirements
    .map((r) => `- id: ${r.id}\n  başlıq: ${r.title}\n  təsvir: ${r.description || '-'}\n  kateqoriya: ${r.category || '-'}\n  məcburi: ${r.mandatory}`)
    .join('\n\n');

  return `ŞİRKƏT MƏLUMATLARI:
---
${profileText}
---

TENDER TƏLƏBLƏRİ:
---
${reqText}
---

Hər tələb üçün yuxarıdakı qaydalara uyğun compliance nəticəsi ver.`;
}

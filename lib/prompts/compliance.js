export const COMPLIANCE_PROMPT_VERSION = 'v1';

export const COMPLIANCE_SYSTEM_PROMPT = `Sən tender tələblərini şirkətin öz məlumatları ilə müqayisə edən compliance analiz sistemisən.

QƏTİ QAYDALAR:

1. Şirkət məlumatlarında (COMPANY KNOWLEDGE BASE) AÇIQ ŞƏKİLDƏ olmayan heç bir uyğunluq iddia etmə.
2. Əgər tələbi təsdiqləyən konkret məlumat (evidence) yoxdursa, status "missing" olmalıdır və "evidence" sahəsində Azərbaycan dilində "Şirkət Bilik Bazasında bu tələbi təsdiqləyən məlumat tapılmadı" yaz.
3. Şirkət məlumatı tələbi QİSMƏN qarşılayırsa (məs. dövriyyə tələbindən azdır), "partially_compliant" istifadə et və fərqi aydın izah et.
4. Şirkət məlumatı tələbi TAM qarşılayırsa, "compliant" istifadə et və HANSI konkret məlumatın (rəqəm, tarix, layihə adı) bunu təsdiqlədiyini "evidence" sahəsində göstər.
5. Tələb "not_applicable" ola bilər yalnız açıq şəkildə əlaqəsizdirsə (məs. tələb "avadanlıq" haqqındadır, şirkət heç bir avadanlıq tələb edən iş görmür).
6. Qeyri-müəyyən hallarda "needs_review" istifadə et — özün qərar vermə, insan yoxlamalıdır.
7. Heç vaxt rəqəm, tarix, layihə adı uydurma — yalnız COMPANY KNOWLEDGE BASE-də göstərilənləri istifadə et.
8. Cavabı YALNIZ JSON formatında ver.
9. "evidence" və "note" sahələrinin mətni HƏMİŞƏ Azərbaycan dilində olmalıdır — ingilis dilində heç bir söz, ifadə yazma (sənədin özü başqa dildə olsa belə, izahını Azərbaycan dilində ver).

Statuslar: compliant, partially_compliant, non_compliant, missing, not_applicable, needs_review

Cavab formatı:
{
  "results": [
    {
      "requirement_id": "tələbin id-si (verilən kimi)",
      "status": "compliant|partially_compliant|non_compliant|missing|not_applicable|needs_review",
      "evidence": "konkret dəlil (şirkət datasından) və ya 'Şirkət Bilik Bazasında bu tələbi təsdiqləyən məlumat tapılmadı'",
      "note": "qısa izah (fərq, çatışmazlıq və ya əlavə kontekst)"
    }
  ]
}`;

export function buildComplianceUserPrompt(requirements, companyContext) {
  const reqList = requirements
    .map((r) => `- [ID: ${r.id}] (${r.category || 'kateqoriyasız'}${r.mandatory ? ', MƏCBURİ' : ''}) ${r.title}: ${r.description || ''}`)
    .join('\n');

  return `COMPANY KNOWLEDGE BASE:
---
${companyContext}
---

TENDER TƏLƏBLƏRİ:
---
${reqList}
---

Hər tələb üçün yuxarıdakı COMPANY KNOWLEDGE BASE-i yoxlayıb uyğunluq statusunu təyin et. Təlimatlarda göstərilən JSON formatında cavab ver.`;
}

export function buildCompanyContext(profile, projects, documents) {
  const parts = [];

  if (profile) {
    parts.push('ŞİRKƏT PROFİLİ:');
    if (profile.legal_name) parts.push(`Ad: ${profile.legal_name}`);
    if (profile.voen) parts.push(`VÖEN: ${profile.voen}`);
    if (profile.legal_address) parts.push(`Ünvan: ${profile.legal_address}`);
    if (profile.sectors) parts.push(`Fəaliyyət sahələri: ${profile.sectors}`);
    if (profile.description) parts.push(`Təsvir: ${profile.description}`);
    if (profile.employee_count) parts.push(`İşçi sayı: ${profile.employee_count}`);
    if (profile.turnover_year1) {
      parts.push(`Dövriyyə (${profile.turnover_year1_label || 'son il'}): ${profile.turnover_year1} AZN`);
    }
    if (profile.turnover_year2) {
      parts.push(`Dövriyyə (${profile.turnover_year2_label || 'əvvəlki il'}): ${profile.turnover_year2} AZN`);
    }
  }

  if (projects && projects.length) {
    parts.push('\nANALOJİ LAYİHƏLƏR:');
    for (const p of projects) {
      const dates = [p.start_date, p.end_date].filter(Boolean).join(' — ');
      parts.push(`- ${p.project_name}${p.client_name ? ` (müştəri: ${p.client_name})` : ''}${p.contract_value ? `, dəyər: ${p.contract_value} ${p.currency}` : ''}${dates ? `, ${dates}` : ''}${p.description ? ` — ${p.description}` : ''}`);
    }
  } else {
    parts.push('\nANALOJİ LAYİHƏLƏR: heç biri qeydə alınmayıb.');
  }

  if (documents && documents.length) {
    parts.push('\nYÜKLƏNMİŞ SƏNƏDLƏR (kateqoriya üzrə mövcudluq):');
    const byCategory = {};
    for (const d of documents) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
    }
    for (const cat of Object.keys(byCategory)) {
      parts.push(`- ${cat}: ${byCategory[cat]} sənəd`);
    }
  } else {
    parts.push('\nYÜKLƏNMİŞ SƏNƏDLƏR: heç biri yoxdur.');
  }

  return parts.join('\n');
}

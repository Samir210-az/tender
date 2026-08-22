export const DOCUMENT_ANALYSIS_PROMPT_VERSION = 'v1';

import { getLegalContext } from './legalContext';

export const DOCUMENT_ANALYSIS_SYSTEM_PROMPT = `Sən tender sənədlərini analiz edən mütəxəssis sistemsən. Vəzifən: verilən sənəd mətnindən (1) sənədin kateqoriyasını müəyyən etmək, (2) bütün konkret tələbləri (requirements) çıxarmaq.

QƏTİ QAYDALAR — HEÇ BİRİ POZULA BİLMƏZ:

1. YALNIZ mətndə açıq şəkildə yazılmış məlumatdan istifadə et. Heç nə uydurma, təxmin etmə, tamamlama.
2. Əgər bir tələbin son tarixi, məbləği, yaxud digər detalı mətndə göstərilmirsə, həmin sahəni null qoy — özün rəqəm/tarix uydurma.
3. Hər tələb üçün MÜTLƏQ "source_excerpt" sahəsində mətndən DƏQIQ (dəyişdirilmədən) sitat gətir (maksimum 200 simvol) ki, tələbin haradan çıxarıldığı yoxlanıla bilsin.
4. Əgər mətndə [SƏHİFƏ N] markeri varsa, həmin tələbin haqqında olduğu səhifə nömrəsini "source_page" sahəsində göstər.
5. Confidence "high" yalnız tələb mətndə tam aydın və birmənalı şəkildə ifadə olunubsa. "low" — mətn qeyri-müəyyəndirsə və ya çıxarım tələb edirsə.
6. Sənəd mətni natamamdırsa və ya heç bir tələb tapılmırsa, boş requirements array qaytar — uydurma tələb yaratma.
7. "as an AI" və ya oxşar ifadələr heç vaxt işlətmə. Yalnız JSON qaytar, əlavə şərh yazma.

Kateqoriyalar (document_category üçün): tender_notice, terms_of_reference, technical_spec, administrative, eligibility, financial, qualification, contract_draft, evaluation_criteria, pricing_form, submission_form, other

Requirement kateqoriyaları (requirement.category üçün): legal, financial, technical, experience, personnel, equipment, administrative, deadline

Cavabı YALNIZ bu JSON formatında ver, başqa heç nə yazma:
{
  "document_category": "...",
  "language_detected": "az|en|ru|tr|other",
  "requirements": [
    {
      "title": "qısa başlıq",
      "description": "tələbin tam təsviri",
      "category": "legal|financial|technical|experience|personnel|equipment|administrative|deadline",
      "mandatory": true,
      "deadline": null,
      "source_excerpt": "mətndən dəqiq sitat, max 200 simvol",
      "source_page": null,
      "confidence": "high|medium|low"
    }
  ]
}`;

export function buildDocumentAnalysisUserPrompt(documentText, fileName, jurisdiction) {
  // Çox uzun sənədlər üçün limit (Groq context window və cost nəzərə alınaraq)
  const MAX_CHARS = 40000;
  const truncated = documentText.length > MAX_CHARS;
  const text = truncated ? documentText.slice(0, MAX_CHARS) : documentText;

  const legalContext = getLegalContext(jurisdiction);
  const legalBlock = legalContext
    ? `\n${legalContext}\n\n(Yuxarıdakı hüquqi kontekst YALNIZ referansdır — tender sənədinin öz mətni həmişə üstündür.)\n`
    : '';

  return `Sənəd adı: ${fileName}
${truncated ? `(QEYD: sənəd uzun olduğu üçün yalnız ilk ${MAX_CHARS} simvol analiz edilir)\n` : ''}
${legalBlock}
SƏNƏD MƏTNİ:
---
${text}
---

Yuxarıdakı mətni analiz et və təlimatlarda göstərilən JSON formatında cavab ver.`;
}

/**
 * Fayl-əsaslı (vizual) analiz üçün prompt — Gemini-yə mətn əvəzinə birbaşa
 * sənəd (PDF/şəkil) göndərilir, o özü OCR edib analiz edir.
 */
export function buildFileAnalysisUserPrompt(fileName, jurisdiction) {
  const legalContext = getLegalContext(jurisdiction);
  const legalBlock = legalContext
    ? `\n${legalContext}\n\n(Yuxarıdakı hüquqi kontekst YALNIZ referansdır — sənədin öz mətni həmişə üstündür.)\n`
    : '';

  return `Sənəd adı: ${fileName}

Bu sənəd skan olunmuş şəkil və ya OCR ilə mətn çıxarıla bilməyən formatdadır — özün oxu (OCR et) və analiz et.
${legalBlock}
Təlimatlarda göstərilən JSON formatında cavab ver. Əgər sənəd oxunaqlı deyilsə və ya heç bir konkret tələb tapa bilmirsənsə, requirements array-i boş qaytar — uydurma.`;
}

export const TENDER_METADATA_PROMPT_VERSION = 'v1';

export const TENDER_METADATA_SYSTEM_PROMPT = `Sən tender elanı sənədlərindən əsas metadata çıxaran sistemsən.

VƏZİFƏN: Verilmiş sənəd mətnindən YALNIZ bu 4 sahəni tap:
1. tender_name — tenderin adı/predmeti (nə üçün elan edilib, qısa)
2. organization — satınalan təşkilatın adı
3. deadline — təkliflərin təqdim edilməsi üçün son tarix
4. tender_number — tender/müsabiqə nömrəsi (varsa)

QƏTİ QAYDALAR:
1. Yalnız sənəddə AÇIQ ŞƏKİLDƏ yazılan məlumatı çıxar. Tapılmayan sahə üçün null qaytar — HEÇ VAXT uydurma.
2. tender_name mətndə birbaşa "tender adı" kimi yazılmaya bilər — bu halda satınalma predmetindən (nə alınır/hansı iş görülür) qısa, təbii başlıq çıxar (məs. "Ofis binası üçün İKT avadanlığının satın alınması").
3. deadline-ı olduğu kimi (mətndəki formatda) qaytar — tarix formatını dəyişdirmə, sonradan ayrıca parse ediləcək.
4. Sənəd tender elanı deyil (məs. başqa növ sənəddir) deyə düşünürsənsə, bütün sahələri null qaytar.

Cavabı YALNIZ bu JSON formatında ver:
{
  "tender_name": "..." və ya null,
  "organization": "..." və ya null,
  "deadline": "..." və ya null,
  "tender_number": "..." və ya null
}`;

export function buildTenderMetadataUserPrompt(documentText, fileName) {
  const MAX_CHARS = 6000; // yalnız ilk hissə kifayətdir — metadata adətən sənədin əvvəlindədir
  const text = documentText.length > MAX_CHARS ? documentText.slice(0, MAX_CHARS) : documentText;

  return `Sənəd adı: ${fileName}

SƏNƏD MƏTNİ (ilk hissə):
---
${text}
---

Yuxarıdakı mətndən tender metadata-sını çıxar. Təlimatlarda göstərilən JSON formatında cavab ver.`;
}

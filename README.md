# Tender AI

Tender sənədlərinin AI ilə analizi, şirkət məlumat bazası ilə uyğunluq yoxlanışı və proposal avtomatlaşdırması üçün SaaS platforması (SECURITY GROUP).

## Status — bütün fazalar tamamlanıb

### Faza 1 — Qeydiyyat və abunə sistemi
- Telefon + PIN qeydiyyatı (Supabase Postgres, RLS ilə qorunur)
- WhatsApp üzərindən manual ödəniş aktivasiyası, aylıq/illik abunə, avtomatik expiry
- Admin panel (`/admin`) — server-side API route (service_role), PIN-header autentifikasiya

### Faza 2 — Tender upload
- Tender yaratma, çoxfayllı sənəd yükləmə (Supabase Storage, private bucket)

### Faza 3 — AI analiz
- AI Provider abstraction (`lib/ai/provider.js`) — Groq/Anthropic arasında bir sətirlə keçid
- Mətn çıxarma: PDF (səhifə markerləri ilə), DOCX, XLSX, TXT/CSV
- Requirement extraction: kateqoriya, məcburi/opsional, source excerpt + səhifə, confidence — **server-side yoxlanılır** (source sənəddə tapılmasa, tələb atılır)
- Skan olunmuş sənədlər/şəkillər üçün Gemini (vizual OCR+analiz bir addımda)
- AI provider seçimi avtomatikdir: normal PDF/DOCX/XLS/TXT/CSV → Groq (pulsuz); şəkil/skan → Gemini

**Hüquqi kontekst / multi-jurisdiction arxitektura**
- `tenders.jurisdiction` (default: AZ) — hər tender öz ölkəsinə bağlıdır
- `lib/prompts/legalContext/az.js` — AZ Dövlət Satınalmaları Qanunu (№ 988-VIQ, 01.01.2024-dən qüvvədə) üzrə doğrulanmış referans
- Digər ölkələr (UZ, KZ, TM, TJ, KG, TR) — sxemdə hazır, UI-da "tezliklə", məzmun yalnız bazara giriş vaxtı araşdırılıb əlavə olunmalıdır
- Hüquqi kontekst YALNIZ istiqamətverici referansdır — tender sənədinin öz mətni həmişə üstündür, hüquqi məsləhət deyil

### Faza 4 — Company Knowledge Base + Compliance Matrix
- `/company` — şirkət profili (VÖEN, ünvan, dövriyyə 2 il üzrə, işçi sayı, sektor), analoji layihələr, sənədlər (hüquqi/maliyyə/sertifikat/lisenziya/referans — bitmə tarixi izlənməsi ilə)
- "Uyğunluğu yoxla" — hər tender tələbi şirkət məlumatları ilə müqayisə olunur (Groq, batch-lənmiş)
- "NO FAKE COMPLIANCE": evidence yoxdursa status "missing", AI özü qərar vermir
- Statuslar: compliant / partially_compliant / non_compliant / missing / not_applicable / needs_review

### Faza 5 — Proposal Generator (Texniki Təklif)
- "Hazırla" (uyğunluq yoxlaması bitdikdən sonra aktiv) — DOCX + PDF: Örtük Məktubu, Şirkət Təqdimatı, Uyğunluq Bəyanatı, Nəticə
- Şirkət yazı üslubu seçimi (rəsmi/texniki/qısa) — `/company`-də
- AI YALNIZ şirkət datasından istifadə edir — uydurma yoxdur, çatışan tələblər üçün neytral ifadə
- **FORMA 1 rəsmi strukturu** (NK Qərarı № 503, 30.12.2023): ünvanlayıcı bloku (tarix, tender nömrəsi, "Kimə"), rəsmi (a)–(j) bəyanat bəndləri (sabit hüquqi mətn, AI yazmır), imza bloku (təchizatçı, VÖEN, imzalayan şəxs, vəzifə) — hamısı mövcud sahələrdən avtomatik doldurulur, redaktə edilə bilər
- **Final Verification Engine**: ikinci AI keçidi generasiya olunan mətni COMPANY DATA ilə tutuşdurur (UNSUPPORTED_CLAIM/WRONG_NUMBER/WRONG_DATE/MISSING_SECTION/...)
- **Deterministik yoxlamalar** (`lib/deterministicChecks.js`) — AI-nin qeyri-sabitliyindən asılı olmayan, HƏMİŞƏ işləyən əlavə müdafiə: uydurma sertifikat adları (ISO və s.), gələcək/bugünkü tarixli "tamamlanmış" layihələr
- Hər sənəddə məcburi xəbərdarlıq: "AI tərəfindən yaradılıb — təqdim etməzdən əvvəl mütləq yoxlayın və təsdiqləyin"
- Signed URL ilə təhlükəsiz endirmə (1 saat etibarlı)

### Faza 6 — Maliyyə Təklifi (FORMA 2)
- `/company` — Məhsul/Xidmət kataloqu (ad, ölçü vahidi, qiymət)
- Tender detail-da "Maliyyə Təklifi" — sətir-sətir qiymət cədvəli, kataloqdan avtomatik qiymət təklifi (ad uyğun gələndə, dəyişdirilə bilər)
- Real FORMA 2 strukturu: № | Təsvir | Ölçü vahidi | Miqdar | Vahid qiyməti | Cəm, Yekun cəm
- Qiymətlər AI tərəfindən YARADILMIR — birbaşa istifadəçi datasıdır, Final Verification tələb olunmur
- DOCX (cədvəl) + PDF (landscape) export

### Əlavə mühərriklər (bütün fazalar boyu)
- **Risk Engine** (`lib/riskEngine.js`) — tamamilə deterministik (AI çağırışı yoxdur): CRITICAL/HIGH/MEDIUM/LOW
- **"Tenderə qatılaqmı?" paneli** — BƏLİ/NƏZƏRDƏN KEÇİR/YOX tövsiyəsi, səbəblərlə, "qərar-dəstək, zəmanət deyil" qeydi ilə
- **Tender Readiness Score** — şəffaf, deterministik hesablama (kateqoriya üzrə məcburi tələblərin faizi)
- **Deadline Engine** — real-time geri sayım, 3 gündən az qalanda qırmızı xəbərdarlıq
- **Document Expiry Engine** — sertifikat/lisenziya bitmə tarixi izlənməsi, `/company`-də ümumi xəbərdarlıq

## Local development

```bash
npm install
cp .env.example .env.local   # dəyərləri doldur
npm run dev
```

## Stack

- Next.js 15 (App Router)
- Supabase Postgres — bütün data (qeydiyyat, tender, company, generated docs), RLS aktiv, giriş yalnız service_role API route-lar vasitəsilə
- Groq (openai/gpt-oss-120b) — mətn analiz/compliance/proposal, pulsuz tier
- Gemini (gemini-3.6-flash) — vizual OCR (skan/şəkil sənədlər)
- docx + pdfkit (DejaVu Sans, base64-embedded) — sənəd generasiyası
- Tailwind CSS

## Texniki qeydlər (gələcək debug üçün)

- **PDF fontlar**: `/public` qovluğu Vercel-in serverless funksiyalarına daxil OLUNMUR (yalnız CDN statik paylanması üçündür) — buna görə DejaVu Sans TTF-lər `lib/fonts/*.js`-də birbaşa base64 kimi saxlanılır, fayl sistemi asılılığı yoxdur.
- **pdfkit**: mütləq dinamik `import()` ilə yüklənməlidir (top-level yox) — əks halda Next.js build zamanı ("Collecting page data") pdfkit-in fs-ə bağlı init kodu xəta verir.
- **require.resolve()**: webpack bundle daxilində path string əvəzinə rəqəmsal module ID qaytarır — bu səbəbdən font/modul yolları üçün istifadə edilmir.
- **Groq**: `openai/gpt-oss-120b` reasoning modelidir, `reasoning_effort: 'low'` + `include_reasoning: false` lazımdır (əks halda bəzən boş cavab qaytarır). TPM limiti (8000) səbəbindən uzun sənədlər `lib/ai/chunkText.js` ilə hissələrə bölünür.

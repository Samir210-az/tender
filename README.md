# Tender AI

Tender sənədlərinin AI ilə analizi, şirkət məlumat bazası ilə uyğunluq yoxlanışı və proposal avtomatlaşdırması üçün SaaS platforması.

## Status

**Faza 1 — Qeydiyyat və abunə sistemi** (tamamlandı)
- Telefon + PIN qeydiyyatı (Supabase Postgres, RLS ilə qorunur)
- WhatsApp üzərindən manual ödəniş aktivasiyası
- Aylıq/illik abunə, avtomatik expiry
- Admin panel (`/admin`) — server-side API route (service_role), PIN-header autentifikasiya, təsdiq/rədd/uzatma

**Faza 2 — Tender upload** (tamamlandı)
- Tender yaratma, çoxfayllı sənəd yükləmə (Supabase Storage)

**Faza 3 — AI analiz** (tamamlandı — Groq)
- AI Provider abstraction (`lib/ai/provider.js`) — Groq/Anthropic arasında bir sətirlə keçid
- Mətn çıxarma: PDF (səhifə markerləri ilə), DOCX, XLSX, TXT/CSV
- Requirement extraction: kateqoriya, məcburi/opsional, source excerpt + səhifə, confidence
- Hallucination qorunması: source olmadan fakt yaradılmır, prompt-da qəti qadağalar
- Skan olunmuş sənədlər/şəkillər üçün Gemini 2.5 Flash (vizual OCR+analiz bir addımda) — Groq mətn-yalnız olduğu üçün bunları emal edə bilmir
- AI provider seçimi avtomatikdir: normal PDF/DOCX/XLS/TXT/CSV → Groq (pulsuz); şəkil və ya skan olunmuş PDF (mətn çıxarıla bilmirsə) → Gemini (vizual)

**Hüquqi kontekst / multi-jurisdiction arxitektura**
- `tenders.jurisdiction` sahəsi (default: AZ) — hər tender öz ölkəsinə bağlıdır
- `lib/prompts/legalContext/az.js` — Azərbaycan Dövlət Satınalmaları Qanunu (№ 988-VIQ, 01.01.2024-dən qüvvədə) üzrə **doğrulanmış, mənbəli** referans, AI analiz prompt-una avtomatik qoşulur
- Digər ölkələr (UZ, KZ, TM, TJ, KG, TR) — sxemdə hazır, UI-da "tezliklə" işarəli, məzmun yalnız bazara giriş vaxtı araşdırılıb əlavə olunmalıdır
- Hüquqi kontekst AI-yə YALNIZ istiqamətverici referansdır — tender sənədinin öz mətni həmişə üstündür, hüquqi məsləhət deyil

**Faza 4 — Company Knowledge Base + Compliance Matrix** (tamamlandı)
- `/company` — şirkət profili (VÖEN, dövriyyə, işçi sayı), analoji layihələr, sənədlər (hüquqi/maliyyə/sertifikat/lisenziya/referans)
- Compliance yoxlaması: hər tender tələbi şirkət məlumatları ilə müqayisə olunur (Groq, batch-lənmiş)
- "NO FAKE COMPLIANCE" prinsipi: evidence yoxdursa status "missing", AI özü qərar vermir — "needs_review" ilə insan yoxlamasına yönləndirir
- Statuslar: compliant / partially_compliant / non_compliant / missing / not_applicable / needs_review

**Faza 5 — Proposal Generator** (tamamlandı)
- "Hazırla" düyməsi (compliance yoxlaması bitdikdən sonra aktiv olur) — real DOCX sənəd yaradır (Örtük Məktubu, Şirkət Təqdimatı, Uyğunluq Bəyanatı, Nəticə)
- Şirkət yazı üslubu seçimi (rəsmi/texniki/qısa) — `/company`-də
- AI YALNIZ şirkət datasından istifadə edir — olmayan nailiyyət/sertifikat/rəqəm uydurmur, çatışmayan tələblər üçün neytral, doğru ifadə işlədir
- Hər generasiya olunan sənəddə **məcburi xəbərdarlıq**: "AI tərəfindən yaradılıb — təqdim etməzdən əvvəl mütləq yoxlayın və təsdiqləyin"
- Signed URL ilə təhlükəsiz endirmə (1 saat etibarlı)

**Faza 4 — Company Knowledge Base + Compliance Matrix** (tamamlandı)
- `/company` — şirkət profili (VÖEN, dövriyyə, işçi sayı və s.) + sənədlər (sertifikat/lisenziya/hüquqi, bitmə tarixi izlənməsi ilə)
- "Compliance yoxla" — hər tender tələbini şirkət profili ilə müqayisə edir, YALNIZ real doldurulmuş sahələrdən istifadə edir (uydurmur)
- Status: compliant / non_compliant / missing / needs_review / not_applicable — hər biri konkret reasoning ilə
- Sənəd tələb edən bəndlər (VÖEN sənədi, referans və s.) avtomatik "needs_review" — hələ yalnız strukturlaşdırılmış sahələr müqayisə olunur, sənəd MƏZMUNU deyil (növbəti addım: company sənədlərinin də RAG-la axtarılması)**Faza 3 — Compliance matrix + Company Knowledge Base** (növbədə)
**Faza 4 — Proposal generator + export** (növbədə)

## Local development

```bash
npm install
cp .env.example .env.local   # dəyərləri doldur
npm run dev
```

## Stack

- Next.js (App Router)
- Supabase Postgres — qeydiyyat/abunə/admin + tender/company data (Faza 2)
- Tailwind CSS

**Deadline Engine + Document Expiry Engine** (tamamlandı)
- Tender son tarixi üçün real-time geri sayım (gün/saat), 3 gündən az qalanda qırmızı xəbərdarlıq
- Şirkət sertifikat/lisenziya sənədləri üçün bitmə tarixi izlənməsi — `/company`-nin yuxarısında ümumi xəbərdarlıq (bitib / 30 gün ərzində bitəcək)

**Risk Engine + Bid Decision Panel** (tamamlandı)
- `lib/riskEngine.js` — tamamilə deterministik (AI çağırışı yoxdur), şəffaf qaydalarla risk səviyyəsi: CRITICAL/HIGH/MEDIUM/LOW
- "Tenderə qatılaqmı?" paneli — BƏLİ/NƏZƏRDƏN KEÇİR/YOX tövsiyəsi, səbəblərlə
- Açıq qeyd: "qərar-dəstək vasitəsidir, zəmanət deyil" (spesifikasiya, 45-ci bənd)

**PDF Export + Final Verification Engine** (tamamlandı)
- "Hazırla" indi həm DOCX, həm PDF yaradır (pdfkit + DejaVu Sans TTF — Azərbaycan hərfləri üçün test edilib doğrulanıb, npm-in woff/woff2 font paketləri fontkit ilə sınıq render olunduğu üçün əsl TTF istifadə olunur)
- Final Verification: ikinci AI keçidi generasiya olunan mətni COMPANY DATA ilə tutuşdurur — UNSUPPORTED_CLAIM/WRONG_NUMBER/WRONG_DATE/MISSING_SECTION/INCONSISTENT_TERMINOLOGY/FORMATTING_ISSUE kateqoriyaları üzrə, severity (critical/high/medium/low) ilə
- Vercel file-tracing üçün ehtiyat tədbiri: `createRequire` + `outputFileTracingIncludes` (font faylının serverless bundle-a düşməsini təmin edir)

**Ünvanlayıcı + İmza Bloku** (tamamlandı)
- Mənbə: Azərbaycan Respublikası Nazirlər Kabinetinin 30.12.2023 tarixli № 503 Qərarı, 1 nömrəli əlavə, IV Bölmə, FORMA 1 (Təklif məktubu) — real dövlət tender sənədindən doğrulanmış struktur
- Ünvanlayıcı bloku (yuxarıda): təqdim tarixi, tender/müsabiqə nömrəsi (`tenders.tender_number` — tender detail səhifəsində redaktə edilə bilər, sənəd analizindən avtomatik təxmin edilir), "Kimə" (`tenders.organization`)
- İmza bloku (aşağıda): təchizatçı adı + VÖEN (`company_profiles`-dən), imzalayan şəxsin adı/vəzifəsi (`company_profiles.authorized_rep_name/position` — `/company`-də redaktə edilir), imza xətti, tarix
- Hər iki blok mövcud sahələrdən avtomatik doldurulur, istənilən vaxt `/company` və ya tender detail səhifəsindən düzəliş edilə bilər — yenidən "Hazırla" edəndə yeni dəyərlərlə generasiya olunur

**Düzəlişlər (bu tur):**
- FORMA 1: boş sahələr (organization, imzalayan şəxs) real sənəddə artıq açıqlayıcı mətn deyil, təmiz boş xətt kimi görünür; UI-da generasiyadan sonra hansı sahələrin doldurulmalı olduğu xəbərdarlıq kimi göstərilir
- Verification Engine v2: strukturlaşdırılmış yoxlama — hər "missing/non_compliant" tələb ayrıca tək-tək yoxlanılır (açıq axtarış əvəzinə)
- Proposal generation temperature 0.5 → 0.3 (üslub müxtəlifliyi ilə fakt təhlükəsizliyi arasında balans, dəqiqlik prioritetdir)
- Sertifikat/standart uydurma qadağası konkret nümunə ilə gücləndirildi (ISO 27001 halı)

**FORMA 1 tam bəyanat + Deterministik Verification** (tamamlandı)
- FORMA 1-in ƏSAS HİSSƏSİ (rəsmi nömrələnmiş (a)-(j) bəyanat bəndləri) əlavə olundu — sabit hüquqi mətn, AI yazmır, uydurma riski yoxdur
- `lib/deterministicChecks.js` — Groq-un qeyri-sabitliyindən (eyni sorğu bəzən problemi tutur, bəzən tutmur) asılı olmayan, HƏMİŞƏ işləyən yoxlamalar:
  - Uydurma sertifikat/standart adları (ISO, HACCP, OHSAS və s.) — mətndə var, COMPANY DATA-da yoxdursa → KRİTİK
  - Gələcək/bugünkü tarixli layihələrin "tamamlanmış" kimi yazılması → YÜKSƏK
- Bu yoxlamalar AI-based Verification Engine-i əvəz etmir, ona əlavə təhlükəsizlik qatıdır

**Faza 6 — Maliyyə Təklifi (FORMA 2)** (tamamlandı)
- `/company` — Məhsul/Xidmət kataloqu (ad, ölçü vahidi, qiymət) — spesifikasiya 10.H
- Tender detail-da "Maliyyə Təklifi" bölməsi — sətir-sətir qiymət cədvəli (təsvir, ölçü, miqdar, qiymət), kataloqdan avtomatik qiymət təklifi (ad uyğun gələndə)
- Real FORMA 2 strukturu (Nazirlər Kabineti Qərarı № 503): № | Təsvir | Ölçü vahidi | Miqdar | Vahid qiyməti | Cəm, Yekun cəm
- **Qiymətlər AI tərəfindən YARADILMIR** — birbaşa istifadəçinin daxil etdiyi/kataloqdan seçdiyi rəqəmlərdir, Final Verification tələb olunmur (`verification_status: not_verified`, əsaslandırılıb)
- DOCX (cədvəl formatında) + PDF (landscape, DejaVu Sans) export

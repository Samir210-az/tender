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

### Faza 7 — Təqdimat Paketi (ZIP)
- "ZIP hazırla" — ən son Texniki Təklif (FORMA 1) + ən son Maliyyə Təklifi (FORMA 2) sənədlərini (DOCX+PDF) bir ZIP faylında birləşdirir
- Paketə avtomatik "OXU-XƏBƏRDARLIQ.txt" əlavə olunur (AI-generated xəbərdarlığı bir daha)
- Yalnız mövcud sənədlərdən istifadə edir — hər hansı biri hazırlanmayıbsa, xəbərdarlıq göstərir, mövcud olanla davam edir

### FORMA 2 dəqiqləşdirilməsi
- Real dövlət sənədi tam açılıb yoxlanıldı (nk.gov.az, NK Qərarı № 503, 1 nömrəli əlavə, IV Bölmə, FORMA 2 "İş həcmləri cədvəli")
- Rəsmi "A. Preambula" bölməsi (5 sabit hüquqi bənd) əlavə olundu — deterministik, AI yazmır
- Sütun başlığı "№" → "Maddə №" (rəsmi terminə tam uyğun)
- Başlıq "FORMA 2 — İş həcmləri cədvəli (Qiymət cədvəli)" — həm işlər (İş həcmləri cədvəli), həm mallar (Qiymət cədvəli) üçün rəsmi adları əhatə edir

### Public Hero səhifəsi
- Qeydiyyat olmayan istifadəçiyə birbaşa forma göstərmək əvəzinə, əvvəlcə `components/Hero.jsx` (dəyər təklifi, TikTok/Instagram reklamlarının vizual üslubuna uyğun — tünd fon, yaşıl/bənövşəyi vurğu) göstərilir
- "Başla" düyməsi qeydiyyat formasını açır (`RegistrationGate`-də `showRegistrationForm` state)
- **Diqqət**: Hero-da HEÇ BİR uydurma statistika yoxdur (reklam şəkillərindəki "250+ şirkət", "92% uyğunluq" kimi rəqəmlər AI-nin nümunə datasıdır, real deyil — saytın özündə istifadə edilməyib)

### Giriş (Login) axını
- Əvvəllər YALNIZ localStorage-a əsaslanan "sessiya" var idi — başqa cihaz/brauzerdən mövcud müştərinin daxil olmaq yolu yox idi (yalnız mənim manual `?restore=` linkim ilə mümkün idi)
- İndi Hero-da "Artıq hesabım var — Giriş" düyməsi — telefon + PIN ilə əsl giriş
- `/api/login` — pin_hash-i client-dəki eyni SHA-256 alqoritmi ilə müqayisə edir, uğurlu olsa regId qaytarır
- Təhlükəsizlik: "telefon tapılmadı" və "PIN səhvdir" eyni generic mesajla göstərilir (enumeration hücumunun qarşısını almaq üçün)

### Loqoya 5-tab admin girişi + Admin panel əməliyyatları genişləndirildi
- Hero-da "TENDER AI" başlığına 5 dəfə (1.5 saniyə ərzində) toxunmaq `/admin`-ə aparır — digər layihələrdəki eyni pattern
- Admin panel: `active`/`expired` statuslu qeydiyyatlara **"Deaktiv et"** (dərhal dayandırır, data qalır, yenidən aktivləşdirilə bilər) və **"Sil"** (təsdiqləmə tələb edir, CASCADE ilə bütün tender/company data-nı da silir — geri qaytarıla bilməz) düymələri əlavə olundu

### "Sənəddən yarat" + İstifadə Təlimatı
- **Sənəddən tender yaratma** — dashboard-da "📄 Sənəddən yarat": elan olunmuş tenderin sənədini birbaşa yükləyirsən, AI tender adını/təşkilatı/son tarixi/nömrəni sənəddən çıxarıb tender-i avtomatik yaradır, fayl ilk sənəd kimi əlavə olunur. Nəticələr tender səhifəsində "✎ Redaktə et" ilə düzəldilə bilər.
- `/telimat` — tam A-dan-Z istifadə təlimatı (şirkət profili doldurmaq, tender daxil etmək, uyğunluq yoxlaması, FORMA 1/2, ZIP paket, müsbət nəticə üçün məsləhətlər)

### FORMA 3/4/5/7 — deterministik əlavə formalar (Kateqoriya A + B tamamlandı)
- `/company`-də yeni bölmələr: Avadanlıq (FORMA 3 üçün), Heyət (FORMA 4 üçün), Analoji layihələr genişləndirildi (əlaqə, vəziyyət, rol sahələri — FORMA 7 üçün)
- Tender detail-da "FORMA 3+4+5+7" — tək düymə, DOCX+PDF, tamamilə deterministik (AI yazmır, yalnız mövcud data rəsmi formata köçürülür)
- `lib/formaRegistry.js` — bütün rəsmi FORMA-ların (İşlər/Mallar üçün ayrı-ayrı) tam siyahısı, hər birinin bizim tərəfdən hazırlana bilib-bilmədiyi statusu ilə
- Tender detail-da "Tenderə tələb olunan bütün sənədlər" checklist-i — satınalma növü seçiminə görə dəyişir, **bizim heç vaxt hazırlaya bilməyəcəyimiz sənədlər** (bank zəmanəti, istehsalçı icazəsi) açıq şəkildə "Platforma HAZIRLAYA BİLMƏZ" işarəsi ilə göstərilir
- Package (ZIP) generasiyasına FORMA 3/4/5/7 sənədi də daxil edildi

### DÜZƏLİŞ: procurement_type constraint uyğunsuzluğu
- Kəşf edildi: `tenders.procurement_type` sütunu əvvəlki sessiyada fərqli dəyərlərlə (`isler`/`mallar`/`xidmetler`) yaradılmışdı, kod isə (`works`/`goods`/`services`) yazırdı — "Satınalma növü" seçimi HƏMİŞƏ uğursuz olardı (constraint pozuntusu). DB constraint kodla uyğunlaşdırıldı.

### FORMA 4 düzəlişi — rəsmi struktura tam uyğunlaşdırma
- Əvvəlki versiya sadələşdirilmiş idi (8 sətir CV) — rəsmi FORMA 4 strukturu ilə tutuşdurulub, çatışan hissələr əlavə edildi: "İş yeri barədə məlumat" bölməsi, "Peşəkar təcrübə", **İltizam** (bəyannamə — sabit hüquqi mətn, imza xətləri namizəd + şirkət nümayəndəsi üçün)
- Konkret tender üçün "Məşğulluq dövrü/İş müddəti" sahələri hələ toplanmır (bu, hər tender üçün fərqlidir) — sənəddə açıq qeyd olunur ki, əl ilə əlavə edilməlidir, uydurulmur

### DOCX/PDF-də səhifə kəsimləri
- FORMA 3, FORMA 4 (hər işçi öz səhifəsində), FORMA 7 — hər biri yeni səhifədən başlayır (əvvəllər hamısı ard-arda axırdı, oxumaq çətin idi)

### Dərin hüquqi audit — rəsmi mətnlə sətir-sətir müqayisə
Rəsmi sənəd (NK Qərarı № 503) ilə kodumuz arasında tapılan uyğunsuzluqlar düzəldildi:
- **FORMA 1, bənd (g)**: "alternativ təkliflər" istisnası əlavə olundu (əvvəllər natamam idi)
- **FORMA 5**: rəsmi olmayan "Vəzifəsi" sahəsi silindi, rəsmi tələb olunan "Ünvanı" (nümayəndənin ünvanı) əlavə olundu — `/company`-də yeni sahə
- **FORMA 4**: yuxarıda "Təchizatçının adı" sətri əlavə olundu, İşəgötürən ünvanı + əlaqəli şəxs əlavə olundu, İltizamda namizədin adı **əvvəlcədən doldurulur** (bilinən datanı boş qoymaq əvəzinə)

**Qalan bilinən boşluqlar (aşağı prioritet, əl ilə tamamlanmalı)**:
- FORMA 4: "Məşğulluq dövrü/İş müddəti" (bu konkret tender üçün) və "Hazırkı iş yerində çalışma müddəti" — tender-spesifik data, izlənmir, sənəddə açıq qeyd olunur ki, əl ilə əlavə edilməlidir
- FORMA 7: davam edən layihələr üçün "tamamlanma faizi" toplanmır
- Xidmətlər (services) üçün FORMA seti bu sistemdə HƏLƏ doğrulanmayıb (yalnız İşlər/Mallar tam yoxlanılıb)

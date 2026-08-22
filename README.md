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
- Növbəti: skan olunmuş sənədlər üçün OCR, compliance matrix (company knowledge base ilə müqayisə)

**Hüquqi kontekst / multi-jurisdiction arxitektura**
- `tenders.jurisdiction` sahəsi (default: AZ) — hər tender öz ölkəsinə bağlıdır
- `lib/prompts/legalContext/az.js` — Azərbaycan Dövlət Satınalmaları Qanunu (№ 988-VIQ, 01.01.2024-dən qüvvədə) üzrə **doğrulanmış, mənbəli** referans, AI analiz prompt-una avtomatik qoşulur
- Digər ölkələr (UZ, KZ, TM, TJ, KG, TR) — sxemdə hazır, UI-da "tezliklə" işarəli, məzmun yalnız bazara giriş vaxtı araşdırılıb əlavə olunmalıdır
- Hüquqi kontekst AI-yə YALNIZ istiqamətverici referansdır — tender sənədinin öz mətni həmişə üstündür, hüquqi məsləhət deyil**Faza 3 — Compliance matrix + Company Knowledge Base** (növbədə)
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

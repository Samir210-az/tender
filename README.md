# Tender AI

Tender sənədlərinin AI ilə analizi, şirkət məlumat bazası ilə uyğunluq yoxlanışı və proposal avtomatlaşdırması üçün SaaS platforması.

## Status

**Faza 1 — Qeydiyyat və abunə sistemi** (tamamlandı)
- Telefon + PIN qeydiyyatı (Supabase Postgres, RLS ilə qorunur)
- WhatsApp üzərindən manual ödəniş aktivasiyası
- Aylıq/illik abunə, avtomatik expiry
- Admin panel (`/admin`) — server-side API route (service_role), PIN-header autentifikasiya, təsdiq/rədd/uzatma

**Faza 2 — Tender upload + AI analiz** (davam edir)
- Tender yaratma (ad, təşkilat, son tarix)
- Çoxfayllı sənəd yükləmə (Supabase Storage, private bucket)
- Bütün giriş server-side API route-lar vasitəsilə (service_role), aktiv abunə yoxlanışı ilə
- Növbəti: OCR + AI classification/requirement extraction (ANTHROPIC_API_KEY lazımdır)**Faza 3 — Compliance matrix + Company Knowledge Base** (növbədə)
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

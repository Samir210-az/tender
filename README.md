# Tender AI

Tender sənədlərinin AI ilə analizi, şirkət məlumat bazası ilə uyğunluq yoxlanışı və proposal avtomatlaşdırması üçün SaaS platforması.

## Status

**Faza 1 — Qeydiyyat və abunə sistemi** (tamamlandı)
- Telefon + PIN qeydiyyatı (Supabase Postgres, RLS ilə qorunur)
- WhatsApp üzərindən manual ödəniş aktivasiyası
- Aylıq/illik abunə, avtomatik expiry
- Admin panel (`/admin`) — server-side API route (service_role), PIN-header autentifikasiya, təsdiq/rədd/uzatma

**Faza 2 — Tender upload + AI analiz** (növbədə)**Faza 3 — Compliance matrix + Company Knowledge Base** (növbədə)
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

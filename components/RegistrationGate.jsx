'use client';

import { useState } from 'react';
import { useSubscription } from '@/lib/useSubscription';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '994552107111';

const PLANS = [
  { id: 'monthly', label: 'Aylıq', price: null },
  { id: 'yearly', label: 'İllik', price: null },
];

export default function RegistrationGate({ children }) {
  const { status, subscription, register, logout } = useSubscription();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [form, setForm] = useState({ companyName: '', phone: '', pin: '', plan: 'monthly' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (status === 'checking') {
    return <FullScreenState message="Yoxlanılır..." />;
  }

  if (status === 'active') {
    return children;
  }

  if (status === 'pending') {
    return (
      <FullScreenState
        title="Qeydiyyat göndərildi"
        message="Ödəniş təsdiqləndikdən sonra hesabınız aktivləşdiriləcək."
        showWhatsApp
        onLogout={logout}
      />
    );
  }

  if (status === 'expired') {
    return (
      <FullScreenState
        title="Abunəlik müddəti bitib"
        message="Yeniləmək üçün əlaqə saxlayın."
        showWhatsApp
        onLogout={logout}
      />
    );
  }

  if (status === 'rejected') {
    return (
      <FullScreenState
        title="Qeydiyyat təsdiqlənmədi"
        message="Ətraflı məlumat üçün əlaqə saxlayın."
        showWhatsApp
        onLogout={logout}
      />
    );
  }

  // status === 'none' — əvvəlcə Hero (dəyər təklifi), yalnız "Başla"
  // basıldıqdan sonra qeydiyyat forması göstərilir.
  if (!showRegistrationForm) {
    return <Hero onStart={() => setShowRegistrationForm(true)} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.companyName.trim() || !form.phone.trim() || form.pin.length < 4) {
      setError('Bütün sahələri düzgün doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
    } catch (err) {
      setError(`Xəta: ${err.message || 'naməlum'} ${err.code ? `(${err.code})` : ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
        <div>
          <button
            type="button"
            onClick={() => setShowRegistrationForm(false)}
            className="mb-3 text-sm text-neutral-500 hover:text-neutral-300"
          >
            ← Geri
          </button>
          <h1 className="text-xl font-semibold text-neutral-100">Qeydiyyat</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Qeydiyyatdan sonra ödəniş WhatsApp vasitəsilə təsdiqlənir.
          </p>
        </div>

        <Field label="Şirkət adı">
          <input
            className="input w-full"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
          />
        </Field>

        <Field label="Telefon">
          <input
            className="input w-full"
            placeholder="+994 XX XXX XX XX"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </Field>

        <Field label="PIN (min 4 rəqəm)">
          <input
            className="input w-full"
            type="password"
            inputMode="numeric"
            value={form.pin}
            onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
          />
        </Field>

        <Field label="Plan">
          <div className="grid grid-cols-2 gap-2">
            {PLANS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setForm((f) => ({ ...f, plan: p.id }))}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  form.plan === p.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-neutral-800 text-neutral-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Göndərilir...' : 'Qeydiyyatdan keç'}
        </button>
      </form>
      <Footer />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function FullScreenState({ title, message, showWhatsApp, onLogout }) {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 px-4 text-center">
      <div className="w-full max-w-sm">
        {title && <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>}
        <p className="mt-2 text-sm text-neutral-400">{message}</p>

        {showWhatsApp && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white"
          >
            <WhatsAppIcon />
            Əlaqə saxla
          </a>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="mt-4 text-sm text-neutral-500 hover:text-neutral-300"
          >
            Çıxış
          </button>
        )}
      </div>
      <Footer />
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.004C6.478 2.004 2 6.482 2 12.008c0 1.94.55 3.752 1.5 5.293L2 22l4.828-1.474a9.96 9.96 0 0 0 5.176 1.438h.004c5.526 0 10.004-4.478 10.004-10.004 0-2.673-1.04-5.187-2.93-7.076a9.938 9.938 0 0 0-7.078-2.88zm5.877 15.877a8.29 8.29 0 0 1-5.877 2.434h-.003a8.276 8.276 0 0 1-4.226-1.157l-.303-.18-3.15.962.918-3.147-.198-.32a8.28 8.28 0 0 1-1.238-4.365c0-4.583 3.73-8.313 8.317-8.313a8.26 8.26 0 0 1 5.876 2.437 8.256 8.256 0 0 1 2.437 5.876 8.283 8.283 0 0 1-2.553 5.773z" />
    </svg>
  );
}

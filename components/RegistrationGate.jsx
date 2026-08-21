'use client';

import { useState } from 'react';
import { useSubscription } from '@/lib/useSubscription';
import Footer from '@/components/Footer';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '994552107111';

const PLANS = [
  { id: 'monthly', label: 'Aylıq', price: null },
  { id: 'yearly', label: 'İllik', price: null },
];

export default function RegistrationGate({ children }) {
  const { status, subscription, register } = useSubscription();
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
        message={`Ödəniş təsdiqləndikdən sonra hesabınız aktivləşdiriləcək. WhatsApp: ${WHATSAPP_NUMBER}`}
      />
    );
  }

  if (status === 'expired') {
    return (
      <FullScreenState
        title="Abunəlik müddəti bitib"
        message={`Yeniləmək üçün WhatsApp vasitəsilə əlaqə saxlayın: ${WHATSAPP_NUMBER}`}
      />
    );
  }

  if (status === 'rejected') {
    return (
      <FullScreenState
        title="Qeydiyyat təsdiqlənmədi"
        message={`Ətraflı məlumat üçün WhatsApp vasitəsilə əlaqə saxlayın: ${WHATSAPP_NUMBER}`}
      />
    );
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
          <h1 className="text-xl font-semibold text-neutral-100">Qeydiyyat</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Qeydiyyatdan sonra ödəniş WhatsApp vasitəsilə təsdiqlənir.
          </p>
        </div>

        <Field label="Şirkət adı">
          <input
            className="input"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
          />
        </Field>

        <Field label="Telefon">
          <input
            className="input"
            placeholder="+994 XX XXX XX XX"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </Field>

        <Field label="PIN (min 4 rəqəm)">
          <input
            className="input"
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

function FullScreenState({ title, message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-center">
      <div>
        {title && <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>}
        <p className="mt-2 text-sm text-neutral-400">{message}</p>
      </div>
    </div>
  );
}

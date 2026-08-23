'use client';

import { useState } from 'react';
import Footer from '@/components/Footer';

const STORAGE_KEY = 'tender_ai_session';

export default function LoginForm({ onBack }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || pin.length < 4) {
      setError('Telefon və PIN daxil edin.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Giriş uğursuz oldu');

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ regId: data.regId, lastCheckedAt: 0 }));
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
        <div>
          <button type="button" onClick={onBack} className="mb-3 text-sm text-neutral-500 hover:text-neutral-300">
            ← Geri
          </button>
          <h1 className="text-xl font-semibold text-neutral-100">Giriş</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Qeydiyyatda göstərdiyin telefon və PIN ilə daxil ol.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-300">Telefon</span>
          <input
            className="input w-full"
            placeholder="+994 XX XXX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-300">PIN</span>
          <input
            className="input w-full"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Yoxlanılır...' : 'Daxil ol'}
        </button>
      </form>
      <Footer />
    </div>
  );
}

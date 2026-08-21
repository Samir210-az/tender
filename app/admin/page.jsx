'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { verifyAdminPin, setAdminSession, hasAdminSession, clearAdminSession } from '@/lib/adminAuth';

const DAY = 24 * 60 * 60 * 1000;
const PLAN_DURATIONS = { monthly: 30 * DAY, yearly: 365 * DAY };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [registrations, setRegistrations] = useState([]);

  useEffect(() => {
    if (hasAdminSession()) setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const regsRef = ref(db, 'registrations/tender');
    const unsub = onValue(regsRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRegistrations(list);
    });
    return () => unsub();
  }, [authed]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    const ok = await verifyAdminPin(pin);
    if (ok) {
      setAdminSession();
      setAuthed(true);
      setPinError('');
    } else {
      setPinError('Səhv PIN');
      setPin('');
    }
  };

  const approve = async (reg) => {
    const duration = PLAN_DURATIONS[reg.plan] || PLAN_DURATIONS.monthly;
    await update(ref(db, `registrations/tender/${reg.id}`), {
      status: 'active',
      approvedAt: Date.now(),
      expiresAt: Date.now() + duration,
    });
  };

  const reject = async (reg) => {
    await update(ref(db, `registrations/tender/${reg.id}`), {
      status: 'rejected',
      rejectedAt: Date.now(),
    });
  };

  const extend = async (reg) => {
    const duration = PLAN_DURATIONS[reg.plan] || PLAN_DURATIONS.monthly;
    const base = reg.expiresAt && reg.expiresAt > Date.now() ? reg.expiresAt : Date.now();
    await update(ref(db, `registrations/tender/${reg.id}`), {
      status: 'active',
      expiresAt: base + duration,
    });
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
          <h1 className="text-lg font-semibold text-neutral-100">Admin girişi</h1>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input"
            placeholder="PIN"
          />
          {pinError && <p className="text-sm text-red-400">{pinError}</p>}
          <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white">
            Daxil ol
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Qeydiyyatlar</h1>
          <button
            onClick={() => { clearAdminSession(); setAuthed(false); }}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Çıxış
          </button>
        </div>

        <div className="space-y-3">
          {registrations.length === 0 && (
            <p className="text-sm text-neutral-500">Qeydiyyat yoxdur.</p>
          )}
          {registrations.map((reg) => (
            <div key={reg.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{reg.companyName}</p>
                  <p className="text-sm text-neutral-400">{reg.phone} · {reg.plan === 'yearly' ? 'İllik' : 'Aylıq'}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Status: <StatusBadge status={reg.status} />
                    {reg.expiresAt && (
                      <span className="ml-2">Bitmə: {new Date(reg.expiresAt).toLocaleDateString('az-AZ')}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {reg.status === 'pending' && (
                    <>
                      <button onClick={() => approve(reg)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                        Təsdiqlə
                      </button>
                      <button onClick={() => reject(reg)} className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white">
                        Rədd et
                      </button>
                    </>
                  )}
                  {(reg.status === 'active' || reg.status === 'expired') && (
                    <button onClick={() => extend(reg)} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
                      Uzat
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'text-amber-400',
    active: 'text-emerald-400',
    expired: 'text-red-400',
    rejected: 'text-neutral-500',
  };
  return <span className={map[status] || 'text-neutral-400'}>{status}</span>;
}

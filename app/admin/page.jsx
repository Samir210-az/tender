'use client';

import { useEffect, useState, useCallback } from 'react';
import { verifyAdminPinBrowser } from '@/lib/adminPinHash';

const SESSION_KEY = 'tender_admin_session';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) setAuthed(true);
  }, []);

  const storedPin = useCallback(() => sessionStorage.getItem(SESSION_KEY) || '', []);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/registrations', {
      headers: { 'x-admin-pin': storedPin() },
    });
    if (res.status === 401) {
      setAuthed(false);
      sessionStorage.removeItem(SESSION_KEY);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRegistrations(data.registrations || []);
    setLoading(false);
  }, [storedPin]);

  useEffect(() => {
    if (authed) fetchRegistrations();
  }, [authed, fetchRegistrations]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    const ok = await verifyAdminPinBrowser(pin);
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, pin);
      setAuthed(true);
      setPinError('');
    } else {
      setPinError('Səhv PIN');
      setPin('');
    }
  };

  const performAction = async (action, id) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': storedPin() },
      body: JSON.stringify({ action, id }),
    });
    if (res.ok) fetchRegistrations();
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': storedPin() },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchRegistrations();
      }
    } finally {
      setDeleting(false);
    }
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
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); }}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Çıxış
          </button>
        </div>

        {loading && <p className="text-sm text-neutral-500">Yüklənir...</p>}

        <div className="space-y-3">
          {!loading && registrations.length === 0 && (
            <p className="text-sm text-neutral-500">Qeydiyyat yoxdur.</p>
          )}
          {registrations.map((reg) => (
            <div key={reg.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{reg.company_name}</p>
                  <p className="text-sm text-neutral-400">{reg.phone} · {reg.plan === 'yearly' ? 'İllik' : 'Aylıq'}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Status: <StatusBadge status={reg.status} />
                    {reg.expires_at && (
                      <span className="ml-2">Bitmə: {new Date(reg.expires_at).toLocaleDateString('az-AZ')}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {reg.status === 'pending' && (
                    <>
                      <button onClick={() => performAction('approve', reg.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                        Təsdiqlə
                      </button>
                      <button onClick={() => performAction('reject', reg.id)} className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white">
                        Rədd et
                      </button>
                    </>
                  )}
                  {(reg.status === 'active' || reg.status === 'expired') && (
                    <>
                      <button onClick={() => performAction('extend', reg.id)} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
                        Uzat
                      </button>
                      <button onClick={() => performAction('deactivate', reg.id)} className="rounded-lg bg-amber-600/80 px-3 py-1.5 text-xs font-medium text-white">
                        Deaktiv et
                      </button>
                    </>
                  )}
                  {reg.status === 'rejected' && (
                    <button onClick={() => performAction('approve', reg.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                      Yenidən aktivləşdir
                    </button>
                  )}

                  {confirmDeleteId === reg.id ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDelete(reg.id)}
                        disabled={deleting}
                        className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {deleting ? '...' : 'Təsdiq (həmişəlik)'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
                        Ləğv et
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(reg.id)} className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400">
                      Sil
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

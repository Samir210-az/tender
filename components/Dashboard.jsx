'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/lib/useSubscription';

export default function Dashboard() {
  const { regId, subscription } = useSubscription();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', deadline: '', jurisdiction: 'AZ' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  const fetchTenders = useCallback(async () => {
    if (!regId) return;
    setLoading(true);
    const res = await fetch('/api/tenders', { headers: { 'x-registration-id': regId } });
    const data = await res.json();
    setTenders(data.tenders || []);
    setLoading(false);
  }, [regId]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Tender adı tələb olunur');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xəta baş verdi');
      setShowCreate(false);
      setForm({ name: '', organization: '', deadline: '' });
      fetchTenders();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tenderId) => {
    setDeletingId(tenderId);
    try {
      const res = await fetch(`/api/tenders/${tenderId}`, {
        method: 'DELETE',
        headers: { 'x-registration-id': regId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Silinmə xətası');
      setConfirmDeleteId(null);
      fetchTenders();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Tenderlər</h1>
            {subscription?.company_name && (
              <p className="text-sm text-neutral-500">{subscription.company_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/company" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600">
              Şirkət profili
            </Link>
            <button
              onClick={() => setShowCreate((s) => !s)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              + Yeni tender
            </button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <input
              className="input w-full"
              placeholder="Tender adı"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input w-full"
              placeholder="Təşkilat (opsional)"
              value={form.organization}
              onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
            />
            <input
              className="input w-full"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Yurisdiksiya</label>
              <select
                className="input w-full"
                value={form.jurisdiction}
                onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
              >
                <option value="AZ">Azərbaycan</option>
                <option value="UZ" disabled>Özbəkistan (tezliklə)</option>
                <option value="KZ" disabled>Qazaxıstan (tezliklə)</option>
                <option value="TM" disabled>Türkmənistan (tezliklə)</option>
                <option value="TJ" disabled>Tacikistan (tezliklə)</option>
                <option value="KG" disabled>Qırğızıstan (tezliklə)</option>
                <option value="TR" disabled>Türkiyə (tezliklə)</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? 'Yaradılır...' : 'Yarat'}
            </button>
          </form>
        )}

        {loading && <p className="text-sm text-neutral-500">Yüklənir...</p>}
        {error && !showCreate && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="space-y-3">
          {!loading && tenders.length === 0 && (
            <p className="text-sm text-neutral-500">Hələ tender yoxdur. "+ Yeni tender" ilə başla.</p>
          )}
          {tenders.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-3">
                <Link href={`/tenders/${t.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.name}</p>
                  {t.organization && <p className="truncate text-sm text-neutral-400">{t.organization}</p>}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <StatusBadge status={t.status} />
                    {typeof t.readiness_score === 'number' && (
                      <p className={`mt-0.5 text-xs font-medium ${scoreColorClass(t.readiness_score)}`}>
                        {t.readiness_score}% hazır
                      </p>
                    )}
                    {t.deadline && <DeadlineBadge deadline={t.deadline} />}
                  </div>

                  {confirmDeleteId === t.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {deletingId === t.id ? '...' : 'Təsdiq'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-white"
                      >
                        Ləğv
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                      title="Tender-i sil"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function DeadlineBadge({ deadline }) {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dateLabel = new Date(deadline).toLocaleDateString('az-AZ');

  if (daysLeft < 0) return <p className="mt-1 text-xs font-medium text-red-400">Bitib</p>;
  if (daysLeft <= 3) return <p className="mt-1 text-xs font-medium text-red-400">{daysLeft} gün qalıb ⚠</p>;
  if (daysLeft <= 7) return <p className="mt-1 text-xs font-medium text-amber-400">{daysLeft} gün qalıb</p>;
  return <p className="mt-1 text-xs text-neutral-500">{dateLabel}</p>;
}

function scoreColorClass(score) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function StatusBadge({ status }) {
  const map = {
    draft: ['Qaralama', 'text-neutral-400'],
    analyzing: ['Analiz olunur', 'text-amber-400'],
    ready: ['Hazır', 'text-emerald-400'],
    submitted: ['Təqdim edilib', 'text-blue-400'],
    archived: ['Arxiv', 'text-neutral-600'],
  };
  const [label, cls] = map[status] || [status, 'text-neutral-400'];
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

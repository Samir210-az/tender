'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/lib/useSubscription';

export default function Dashboard() {
  const { regId, subscription } = useSubscription();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', deadline: '' });
  const [creating, setCreating] = useState(false);
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

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tenderlər</h1>
            {subscription?.company_name && (
              <p className="text-sm text-neutral-500">{subscription.company_name}</p>
            )}
          </div>
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Yeni tender
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <input
              className="input"
              placeholder="Tender adı"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Təşkilat (opsional)"
              value={form.organization}
              onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
            />
            <input
              className="input"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
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

        <div className="space-y-3">
          {!loading && tenders.length === 0 && (
            <p className="text-sm text-neutral-500">Hələ tender yoxdur. "+ Yeni tender" ilə başla.</p>
          )}
          {tenders.map((t) => (
            <Link
              key={t.id}
              href={`/tenders/${t.id}`}
              className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  {t.organization && <p className="text-sm text-neutral-400">{t.organization}</p>}
                </div>
                <div className="text-right">
                  <StatusBadge status={t.status} />
                  {t.deadline && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(t.deadline).toLocaleDateString('az-AZ')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
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

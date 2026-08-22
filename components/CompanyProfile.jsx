'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSubscription } from '@/lib/useSubscription';

const CATEGORY_LABELS = {
  legal: 'Hüquqi',
  financial: 'Maliyyə',
  certificate: 'Sertifikat',
  license: 'Lisenziya',
  experience_reference: 'Təcrübə/Referans',
  other: 'Digər',
};

export default function CompanyPage() {
  const { regId } = useSubscription();
  const [profile, setProfile] = useState({});
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('legal');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!regId) return;
    const headers = { 'x-registration-id': regId };
    const [profileRes, docsRes] = await Promise.all([
      fetch('/api/company', { headers }),
      fetch('/api/company/documents', { headers }),
    ]);
    const profileData = await profileRes.json();
    const docsData = await docsRes.json();
    setProfile(profileData.profile || {});
    setDocuments(docsData.documents || []);
    setLoading(false);
  }, [regId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory);
    if (uploadExpiry) formData.append('expiry_date', uploadExpiry);
    try {
      const res = await fetch('/api/company/documents', {
        method: 'POST',
        headers: { 'x-registration-id': regId },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yükləmə xətası');
      setUploadExpiry('');
      fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    await fetch(`/api/company/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'x-registration-id': regId },
    });
    fetchAll();
  };

  if (loading) {
    return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100"><p className="text-sm text-neutral-500">Yüklənir...</p></main>;
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← Geri</a>
        <h1 className="mt-3 mb-6 text-2xl font-semibold">Şirkət profili</h1>

        <div className="mb-8 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <Field label="Hüquqi ad">
            <input className="input" value={profile.legal_name || ''} onChange={(e) => setProfile((p) => ({ ...p, legal_name: e.target.value }))} />
          </Field>
          <Field label="VÖEN">
            <input className="input" value={profile.voen || ''} onChange={(e) => setProfile((p) => ({ ...p, voen: e.target.value }))} />
          </Field>
          <Field label="Hüquqi ünvan">
            <input className="input" value={profile.legal_address || ''} onChange={(e) => setProfile((p) => ({ ...p, legal_address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefon">
              <input className="input" value={profile.phone || ''} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input className="input" value={profile.email || ''} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Təsis ili">
              <input className="input" type="number" value={profile.founded_year || ''} onChange={(e) => setProfile((p) => ({ ...p, founded_year: e.target.value ? parseInt(e.target.value) : null }))} />
            </Field>
            <Field label="İşçi sayı">
              <input className="input" type="number" value={profile.employee_count || ''} onChange={(e) => setProfile((p) => ({ ...p, employee_count: e.target.value ? parseInt(e.target.value) : null }))} />
            </Field>
            <Field label="İllik dövriyyə (AZN)">
              <input className="input" type="number" value={profile.annual_turnover_azn || ''} onChange={(e) => setProfile((p) => ({ ...p, annual_turnover_azn: e.target.value ? parseFloat(e.target.value) : null }))} />
            </Field>
          </div>
          <Field label="Şirkət təsviri">
            <textarea className="input" rows={3} value={profile.description || ''} onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))} />
          </Field>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saxlanılır...' : saved ? '✓ Saxlanıldı' : 'Saxla'}
          </button>
        </div>

        <h2 className="mb-3 text-lg font-semibold">Sənədlər</h2>

        <div className="mb-4 rounded-xl border border-dashed border-neutral-700 bg-neutral-900 p-5">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <select className="input" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              className="input"
              type="date"
              placeholder="Bitmə tarixi (opsional)"
              value={uploadExpiry}
              onChange={(e) => setUploadExpiry(e.target.value)}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleUpload}
            className="hidden"
            id="company-file-upload"
          />
          <label htmlFor="company-file-upload" className="block cursor-pointer rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white">
            {uploading ? 'Yüklənir...' : 'Sənəd yüklə'}
          </label>
        </div>

        <div className="space-y-2">
          {documents.length === 0 && <p className="text-sm text-neutral-500">Hələ sənəd yüklənməyib.</p>}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.doc_name}</p>
                <p className="text-xs text-neutral-500">
                  {CATEGORY_LABELS[doc.category]}
                  {doc.expiry_date && <ExpiryBadge date={doc.expiry_date} />}
                </p>
              </div>
              <button onClick={() => handleDeleteDoc(doc.id)} className="shrink-0 text-xs text-red-400 hover:text-red-300">
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function ExpiryBadge({ date }) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="ml-2 text-red-400">Müddəti bitib</span>;
  if (days <= 30) return <span className="ml-2 text-amber-400">{days} gün qalıb</span>;
  return <span className="ml-2">Bitmə: {new Date(date).toLocaleDateString('az-AZ')}</span>;
}

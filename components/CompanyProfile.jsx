'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSubscription } from '@/lib/useSubscription';

const DOC_CATEGORY_LABELS = {
  legal: 'Hüquqi',
  financial: 'Maliyyə',
  certificate: 'Sertifikat',
  license: 'Lisenziya',
  reference_letter: 'Referans məktubu',
  other: 'Digər',
};

export default function CompanyProfile() {
  const { regId } = useSubscription();
  const [profile, setProfile] = useState({});
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ project_name: '', client_name: '', contract_value: '', start_date: '', end_date: '', description: '' });
  const [uploadCategory, setUploadCategory] = useState('legal');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!regId) return;
    const headers = { 'x-registration-id': regId };
    const [profileRes, projectsRes, docsRes] = await Promise.all([
      fetch('/api/company', { headers }),
      fetch('/api/company/projects', { headers }),
      fetch('/api/company/documents', { headers }),
    ]);
    const profileData = await profileRes.json();
    const projectsData = await projectsRes.json();
    const docsData = await docsRes.json();
    setProfile(profileData.profile || {});
    setProjects(projectsData.projects || []);
    setDocuments(docsData.documents || []);
    setLoading(false);
  }, [regId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleProfileChange = (field, value) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yadda saxlanmadı');
      setProfile(data.profile);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setError('');
    if (!projectForm.project_name.trim()) {
      setError('Layihə adı tələb olunur');
      return;
    }
    try {
      const res = await fetch('/api/company/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
        body: JSON.stringify(projectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xəta');
      setShowProjectForm(false);
      setProjectForm({ project_name: '', client_name: '', contract_value: '', start_date: '', end_date: '', description: '' });
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (id) => {
    await fetch(`/api/company/projects/${id}`, { method: 'DELETE', headers: { 'x-registration-id': regId } });
    fetchAll();
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    for (const file of files) {
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
        if (!res.ok) throw new Error(`${file.name}: ${data.error}`);
      } catch (err) {
        setError((p) => (p ? `${p}\n${err.message}` : err.message));
      }
    }
    setUploading(false);
    setUploadExpiry('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchAll();
  };

  const handleDeleteDocument = async (id) => {
    await fetch(`/api/company/documents/${id}`, { method: 'DELETE', headers: { 'x-registration-id': regId } });
    fetchAll();
  };

  if (loading) {
    return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100"><p className="text-sm text-neutral-500">Yüklənir...</p></main>;
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← Geri</a>
        <h1 className="mt-3 mb-6 text-2xl font-semibold">Şirkət profili</h1>

        {error && <p className="mb-4 whitespace-pre-line text-sm text-red-400">{error}</p>}

        <ExpiryAlertSummary documents={documents} />

        <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-lg font-medium">Əsas məlumatlar</h2>
          <div className="space-y-3">
            <Field label="Hüquqi ad">
              <input className="input w-full" value={profile.legal_name || ''} onChange={(e) => handleProfileChange('legal_name', e.target.value)} />
            </Field>
            <Field label="VÖEN">
              <input className="input w-full" value={profile.voen || ''} onChange={(e) => handleProfileChange('voen', e.target.value)} />
            </Field>
            <Field label="Hüquqi ünvan">
              <input className="input w-full" value={profile.legal_address || ''} onChange={(e) => handleProfileChange('legal_address', e.target.value)} />
            </Field>
            <Field label="Fəaliyyət sahələri">
              <input className="input w-full" placeholder="məs. İKT, tikinti" value={profile.sectors || ''} onChange={(e) => handleProfileChange('sectors', e.target.value)} />
            </Field>
            <Field label="Şirkət haqqında">
              <textarea className="input w-full" rows={3} value={profile.description || ''} onChange={(e) => handleProfileChange('description', e.target.value)} />
            </Field>
            <Field label="İşçi sayı">
              <input type="number" className="input w-full" value={profile.employee_count || ''} onChange={(e) => handleProfileChange('employee_count', e.target.value ? parseInt(e.target.value) : null)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dövriyyə (son il)">
                <input type="number" className="input w-full" placeholder="AZN" value={profile.turnover_year1 || ''} onChange={(e) => handleProfileChange('turnover_year1', e.target.value ? parseFloat(e.target.value) : null)} />
              </Field>
              <Field label="İl">
                <input className="input w-full" placeholder="2025" value={profile.turnover_year1_label || ''} onChange={(e) => handleProfileChange('turnover_year1_label', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dövriyyə (əvvəlki il)">
                <input type="number" className="input w-full" placeholder="AZN" value={profile.turnover_year2 || ''} onChange={(e) => handleProfileChange('turnover_year2', e.target.value ? parseFloat(e.target.value) : null)} />
              </Field>
              <Field label="İl">
                <input className="input w-full" placeholder="2024" value={profile.turnover_year2_label || ''} onChange={(e) => handleProfileChange('turnover_year2_label', e.target.value)} />
              </Field>
            </div>
            <Field label="Sənəd yazı üslubu (AI-nin hazırladığı sənədlər üçün)">
              <select className="input w-full" value={profile.writing_tone || 'formal'} onChange={(e) => handleProfileChange('writing_tone', e.target.value)}>
                <option value="formal">Rəsmi</option>
                <option value="technical">Texniki</option>
                <option value="concise">Qısa</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="İmzalayan şəxs (ad, soyad)">
                <input className="input w-full" placeholder="məs. Əli Vəliyev" value={profile.authorized_rep_name || ''} onChange={(e) => handleProfileChange('authorized_rep_name', e.target.value)} />
              </Field>
              <Field label="Vəzifəsi">
                <input className="input w-full" placeholder="məs. Direktor" value={profile.authorized_rep_position || ''} onChange={(e) => handleProfileChange('authorized_rep_position', e.target.value)} />
              </Field>
            </div>
            <p className="text-[11px] text-neutral-500">
              Bu məlumatlar generasiya olunan sənədlərin imza blokunda avtomatik istifadə olunur (rəsmi FORMA 1 tələbinə uyğun — NK Qərarı № 503, 30.12.2023).
            </p>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saxlanılır...' : saved ? 'Saxlanıldı ✓' : 'Yadda saxla'}
          </button>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Təcrübə / Analoji layihələr</h2>
            <button onClick={() => setShowProjectForm((s) => !s)} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
              + Layihə əlavə et
            </button>
          </div>

          {showProjectForm && (
            <form onSubmit={handleAddProject} className="mb-4 space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <input className="input w-full" placeholder="Layihə adı" value={projectForm.project_name} onChange={(e) => setProjectForm((f) => ({ ...f, project_name: e.target.value }))} />
              <input className="input w-full" placeholder="Müştəri" value={projectForm.client_name} onChange={(e) => setProjectForm((f) => ({ ...f, client_name: e.target.value }))} />
              <input type="number" className="input w-full" placeholder="Müqavilə dəyəri (AZN)" value={projectForm.contract_value} onChange={(e) => setProjectForm((f) => ({ ...f, contract_value: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input w-full" value={projectForm.start_date} onChange={(e) => setProjectForm((f) => ({ ...f, start_date: e.target.value }))} />
                <input type="date" className="input w-full" value={projectForm.end_date} onChange={(e) => setProjectForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
              <textarea className="input w-full" rows={2} placeholder="Təsvir" value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} />
              <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">Əlavə et</button>
            </form>
          )}

          <div className="space-y-2">
            {projects.length === 0 && <p className="text-sm text-neutral-500">Hələ layihə əlavə edilməyib.</p>}
            {projects.map((p) => (
              <div key={p.id} className="flex items-start justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <div>
                  <p className="text-sm font-medium">{p.project_name}</p>
                  {p.client_name && <p className="text-xs text-neutral-400">{p.client_name}</p>}
                  {p.contract_value && <p className="text-xs text-neutral-500">{p.contract_value} {p.currency}</p>}
                </div>
                <button onClick={() => handleDeleteProject(p.id)} className="text-xs text-red-400">Sil</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Sənədlər</h2>
          <div className="mb-4 rounded-xl border border-dashed border-neutral-700 bg-neutral-900 p-5">
            <select className="input w-full mb-3" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {(uploadCategory === 'certificate' || uploadCategory === 'license') && (
              <div className="mb-3">
                <label className="mb-1 block text-xs text-neutral-400">Bitmə tarixi (opsional)</label>
                <input type="date" className="input w-full" value={uploadExpiry} onChange={(e) => setUploadExpiry(e.target.value)} />
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" id="company-file-upload" />
            <label htmlFor="company-file-upload" className="block cursor-pointer rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-medium text-white">
              {uploading ? 'Yüklənir...' : 'Sənəd yüklə'}
            </label>
          </div>

          <div className="space-y-2">
            {documents.length === 0 && <p className="text-sm text-neutral-500">Hələ sənəd yüklənməyib.</p>}
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <div>
                  <p className="text-sm font-medium">{doc.file_name}</p>
                  <p className="text-xs text-neutral-500">{DOC_CATEGORY_LABELS[doc.category]}</p>
                  {doc.expiry_date && <ExpiryBadge expiryDate={doc.expiry_date} />}
                </div>
                <button onClick={() => handleDeleteDocument(doc.id)} className="text-xs text-red-400">Sil</button>
              </div>
            ))}
          </div>
        </section>

        {/* MƏHSUL/XİDMƏT KATALOQU */}
        <section className="mt-8">
          <ProductCatalog regId={regId} />
        </section>
      </div>
    </main>
  );
}

function ProductCatalog({ regId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', unit: 'ədəd', unit_price: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = async () => {
    const res = await fetch('/api/company/products', { headers: { 'x-registration-id': regId } });
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => { if (regId) fetchProducts(); }, [regId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await fetch('/api/company/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
      body: JSON.stringify(form),
    });
    setForm({ name: '', unit: 'ədəd', unit_price: '' });
    setShowForm(false);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    await fetch(`/api/company/products/${id}`, { method: 'DELETE', headers: { 'x-registration-id': regId } });
    fetchProducts();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium">Məhsul/Xidmət kataloqu</h2>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
          + Əlavə et
        </button>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        Tender qiymət cədvəllərində sətir adları bura uyğun gələndə qiymət avtomatik təklif olunur.
      </p>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <input className="input w-full" placeholder="Məhsul/xidmət adı" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input w-full" placeholder="Ölçü vahidi (ədəd, m², saat...)" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            <input type="number" className="input w-full" placeholder="Vahid qiyməti (AZN)" value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))} />
          </div>
          <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">Əlavə et</button>
        </form>
      )}

      <div className="space-y-2">
        {!loading && products.length === 0 && <p className="text-sm text-neutral-500">Hələ məhsul/xidmət əlavə edilməyib.</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-neutral-500">{p.unit}{p.unit_price ? ` · ${p.unit_price} ${p.currency}` : ''}</p>
            </div>
            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400">Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpiryAlertSummary({ documents }) {
  const now = Date.now();
  const withExpiry = documents.filter((d) => d.expiry_date);
  const expired = withExpiry.filter((d) => new Date(d.expiry_date).getTime() < now);
  const expiringSoon = withExpiry.filter((d) => {
    const days = (new Date(d.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  });

  if (expired.length === 0 && expiringSoon.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      {expired.length > 0 && (
        <p className="text-sm text-red-400">
          ⚠ {expired.length} sənədin (sertifikat/lisenziya) müddəti bitib: {expired.map((d) => d.file_name).join(', ')}
        </p>
      )}
      {expiringSoon.length > 0 && (
        <p className="mt-1 text-sm text-amber-400">
          30 gün ərzində bitəcək: {expiringSoon.map((d) => d.file_name).join(', ')}
        </p>
      )}
    </div>
  );
}

function ExpiryBadge({ expiryDate }) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  let label, cls;
  if (daysLeft < 0) {
    label = 'Müddəti bitib';
    cls = 'text-red-400';
  } else if (daysLeft <= 30) {
    label = `${daysLeft} gün qalıb`;
    cls = 'text-amber-400';
  } else {
    label = `Bitmə: ${expiry.toLocaleDateString('az-AZ')}`;
    cls = 'text-neutral-500';
  }

  return <p className={`text-xs ${cls}`}>{label}</p>;
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

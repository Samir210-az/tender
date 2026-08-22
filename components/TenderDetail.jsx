'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSubscription } from '@/lib/useSubscription';

const CATEGORY_LABELS = {
  tender_notice: 'Elan',
  terms_of_reference: 'ToR',
  technical_spec: 'Texniki şərtlər',
  administrative: 'İnzibati',
  eligibility: 'Uyğunluq',
  financial: 'Maliyyə',
  qualification: 'Kvalifikasiya',
  contract_draft: 'Müqavilə layihəsi',
  evaluation_criteria: 'Qiymətləndirmə',
  pricing_form: 'Qiymət forması',
  submission_form: 'Təqdimat forması',
  other: 'Digər',
};

export default function TenderDetail({ tenderId }) {
  const { regId } = useSubscription();
  const [tender, setTender] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!regId || !tenderId) return;
    const res = await fetch(`/api/tenders/${tenderId}`, { headers: { 'x-registration-id': regId } });
    const data = await res.json();
    if (res.ok) {
      setTender(data.tender);
      setDocuments(data.documents || []);
    } else {
      setError(data.error || 'Xəta baş verdi');
    }
    setLoading(false);
  }, [regId, tenderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');
    setUploading(true);

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`/api/tenders/${tenderId}/documents`, {
          method: 'POST',
          headers: { 'x-registration-id': regId },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`${file.name}: ${data.error || 'yüklənmədi'}`);
      } catch (err) {
        setError((prev) => (prev ? `${prev}\n${err.message}` : err.message));
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchData();
  };

  if (loading) {
    return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100"><p className="text-sm text-neutral-500">Yüklənir...</p></main>;
  }

  if (!tender) {
    return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100"><p className="text-sm text-red-400">{error || 'Tender tapılmadı'}</p></main>;
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← Geri</a>

        <div className="mt-3 mb-6">
          <h1 className="text-2xl font-semibold">{tender.name}</h1>
          {tender.organization && <p className="text-sm text-neutral-400">{tender.organization}</p>}
          {tender.deadline && (
            <p className="mt-1 text-sm text-amber-400">
              Son tarix: {new Date(tender.deadline).toLocaleDateString('az-AZ')}
            </p>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-dashed border-neutral-700 bg-neutral-900 p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white inline-block"
          >
            {uploading ? 'Yüklənir...' : 'Sənəd yüklə'}
          </label>
          <p className="mt-2 text-xs text-neutral-500">PDF, DOC, XLS, ZIP, şəkil — max 50MB</p>
        </div>

        {error && <p className="mb-4 whitespace-pre-line text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          {documents.length === 0 && (
            <p className="text-sm text-neutral-500">Hələ sənəd yüklənməyib.</p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div>
                <p className="text-sm font-medium">{doc.file_name}</p>
                <p className="text-xs text-neutral-500">
                  {CATEGORY_LABELS[doc.category] || 'Təsnif edilməyib'} · {formatSize(doc.file_size)}
                </p>
              </div>
              <OcrBadge status={doc.ocr_status} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function OcrBadge({ status }) {
  const map = {
    pending: ['Gözləyir', 'text-neutral-500'],
    processing: ['İşlənir', 'text-amber-400'],
    done: ['Hazır', 'text-emerald-400'],
    failed: ['Xəta', 'text-red-400'],
  };
  const [label, cls] = map[status] || [status, 'text-neutral-500'];
  return <span className={`text-xs ${cls}`}>{label}</span>;
}

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

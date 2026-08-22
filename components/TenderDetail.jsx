'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSubscription } from '@/lib/useSubscription';
import { computeRisks, summarizeRisks, computeBidRecommendation } from '@/lib/riskEngine';

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

const REQ_CATEGORY_LABELS = {
  legal: 'Hüquqi',
  financial: 'Maliyyə',
  technical: 'Texniki',
  experience: 'Təcrübə',
  personnel: 'Personal',
  equipment: 'Avadanlıq',
  administrative: 'İnzibati',
  deadline: 'Son tarix',
};

export default function TenderDetail({ tenderId }) {
  const { regId } = useSubscription();
  const [tender, setTender] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState({});
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [letterheadWarnings, setLetterheadWarnings] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!regId || !tenderId) return;
    const headers = { 'x-registration-id': regId };
    const [tenderRes, reqRes, genRes] = await Promise.all([
      fetch(`/api/tenders/${tenderId}`, { headers }),
      fetch(`/api/tenders/${tenderId}/requirements`, { headers }),
      fetch(`/api/tenders/${tenderId}/documents-generated`, { headers }),
    ]);
    const tenderData = await tenderRes.json();
    const reqData = await reqRes.json();
    const genData = await genRes.json();
    if (tenderRes.ok) {
      setTender(tenderData.tender);
      setDocuments(tenderData.documents || []);
    } else {
      setError(tenderData.error || 'Xəta baş verdi');
    }
    if (reqRes.ok) setRequirements(reqData.requirements || []);
    if (genRes.ok) setGeneratedDocs(genData.documents || []);
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

  const handleAnalyze = async (docId) => {
    setAnalyzing((a) => ({ ...a, [docId]: true }));
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tenderId}/documents/${docId}/analyze`, {
        method: 'POST',
        headers: { 'x-registration-id': regId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analiz xətası');
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing((a) => ({ ...a, [docId]: false }));
      fetchData();
    }
  };

  const handleComplianceCheck = async () => {
    setCheckingCompliance(true);
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tenderId}/compliance-check`, {
        method: 'POST',
        headers: { 'x-registration-id': regId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uyğunluq yoxlaması uğursuz oldu');
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingCompliance(false);
      fetchData();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setLetterheadWarnings([]);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/generate`, {
        method: 'POST',
        headers: { 'x-registration-id': regId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sənəd hazırlanmadı');
      if (data.letterheadWarnings?.length) setLetterheadWarnings(data.letterheadWarnings);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
      fetchData();
    }
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
          <TenderNumberField tenderId={tenderId} regId={regId} value={tender.tender_number} onSaved={fetchData} />
          {tender.deadline && <DeadlineCountdown deadline={tender.deadline} />}
          {typeof tender.readiness_score === 'number' && (
            <ReadinessScoreCard score={tender.readiness_score} breakdown={tender.readiness_breakdown} />
          )}
          {requirements.some((r) => r.compliance_checked_at) && (
            <BidDecisionPanel
              requirements={requirements}
              readinessScore={tender.readiness_score}
              deadline={tender.deadline}
            />
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
            <div key={doc.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.file_name}</p>
                  <p className="text-xs text-neutral-500">
                    {CATEGORY_LABELS[doc.category] || 'Təsnif edilməyib'} · {formatSize(doc.file_size)}
                  </p>
                  {doc.analysis_error && (
                    <p className="mt-1 text-xs text-red-400">{doc.analysis_error}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <OcrBadge status={doc.ocr_status} />
                  {doc.ocr_status !== 'done' && doc.ocr_status !== 'processing' && (
                    <button
                      onClick={() => handleAnalyze(doc.id)}
                      disabled={analyzing[doc.id]}
                      className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {analyzing[doc.id] ? 'Analiz olunur...' : 'Analiz et'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {requirements.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tələblər ({requirements.length})</h2>
              <button
                onClick={handleComplianceCheck}
                disabled={checkingCompliance}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {checkingCompliance ? 'Yoxlanılır...' : 'Uyğunluğu yoxla'}
              </button>
            </div>
            <p className="mb-3 text-xs text-neutral-500">
              Şirkət profili (VÖEN, dövriyyə və s.) tender tələbləri ilə müqayisə olunur.{' '}
              <a href="/company" className="underline">Profili redaktə et</a>
            </p>

            <MissingMandatoryList requirements={requirements} />
            <div className="space-y-2">
              {requirements.map((req) => (
                <div key={req.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500">
                          {REQ_CATEGORY_LABELS[req.category] || req.category || '—'}
                        </span>
                        {req.mandatory && (
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                            MƏCBURİ
                          </span>
                        )}
                        <ConfidenceBadge confidence={req.confidence} />
                        {req.status && <ComplianceBadge status={req.status} />}
                      </div>
                      <p className="mt-1 font-medium">{req.title}</p>
                      {req.description && (
                        <p className="mt-1 text-sm text-neutral-400">{req.description}</p>
                      )}
                      {req.source_excerpt && (
                        <p className="mt-2 border-l-2 border-neutral-700 pl-2 text-xs italic text-neutral-500">
                          "{req.source_excerpt}"
                          {req.source_page && ` — səhifə ${req.source_page}`}
                        </p>
                      )}
                      {(req.deadline || req.deadline_raw) && (
                        <p className="mt-1 text-xs text-amber-400">
                          Son tarix: {req.deadline ? new Date(req.deadline).toLocaleString('az-AZ') : req.deadline_raw}
                        </p>
                      )}
                      {(req.compliance_evidence || req.compliance_note) && (
                        <div className="mt-2 rounded bg-neutral-800/50 p-2 text-xs">
                          {req.compliance_evidence && (
                            <p className="text-neutral-300">
                              <span className="text-neutral-500">Dəlil: </span>{req.compliance_evidence}
                            </p>
                          )}
                          {req.compliance_note && (
                            <p className="mt-1 text-neutral-400">{req.compliance_note}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requirements.some((r) => r.compliance_checked_at) && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sənəd hazırla</h2>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {generating ? 'Hazırlanır...' : 'Hazırla'}
              </button>
            </div>
            <p className="mb-3 text-xs text-neutral-500">
              Şirkət profili və uyğunluq nəticələri əsasında Texniki Təklif sənədi hazırlanır (DOCX + PDF), sonra ikinci AI keçidi ilə yoxlanılır.
            </p>

            {letterheadWarnings.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-medium text-amber-400">
                  ⚠ Sənəddə boş qalan sahələr (əl ilə doldurulmalıdır):
                </p>
                <ul className="mt-1 space-y-0.5">
                  {letterheadWarnings.map((w, i) => (
                    <li key={i} className="text-xs text-neutral-400">• {w}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs">
                  <a href="/company" className="underline text-amber-400">Şirkət profilini tamamla</a> və yenidən hazırla.
                </p>
              </div>
            )}

            {generatedDocs.filter((d) => d.doc_type !== 'price_schedule').length > 0 && (
              <div className="space-y-2">
                {generatedDocs.filter((d) => d.doc_type !== 'price_schedule').map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.file_name}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(doc.created_at).toLocaleString('az-AZ')}
                        </p>
                        <VerificationBadge status={doc.verification_status} issues={doc.verification_issues} error={doc.verification_error} />
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {doc.download_url && (
                          <a href={doc.download_url} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white">
                            DOCX
                          </a>
                        )}
                        {doc.download_url_pdf && (
                          <a href={doc.download_url_pdf} className="rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white">
                            PDF
                          </a>
                        )}
                      </div>
                    </div>

                    {doc.pdf_generation_error && (
                      <p className="mt-1 text-[11px] text-red-400">PDF xətası: {doc.pdf_generation_error}</p>
                    )}

                    {doc.verification_issues && doc.verification_issues.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-purple-500/20 pt-2">
                        {doc.verification_issues.map((issue, i) => (
                          <p key={i} className="text-[11px] text-neutral-400">
                            <IssueSeverityTag severity={issue.severity} /> {issue.description}
                            {issue.location && <span className="text-neutral-600"> ({issue.location})</span>}
                          </p>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-[11px] text-amber-400">
                      ⚠ AI tərəfindən yaradılıb — təqdim etməzdən əvvəl mütləq yoxlayın və təsdiqləyin.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MALİYYƏ TƏKLİFİ (FORMA 2) */}
        <PriceSchedule tenderId={tenderId} regId={regId} generatedDocs={generatedDocs.filter((d) => d.doc_type === 'price_schedule')} onRefresh={fetchData} />

        <SubmissionPackage
          tenderId={tenderId}
          regId={regId}
          hasTechnical={generatedDocs.some((d) => d.doc_type === 'technical_proposal')}
          hasPrice={generatedDocs.some((d) => d.doc_type === 'price_schedule')}
          generatedDocs={generatedDocs.filter((d) => d.doc_type === 'submission_package')}
          onRefresh={fetchData}
        />
      </div>
    </main>
  );
}

function SubmissionPackage({ tenderId, regId, hasTechnical, hasPrice, generatedDocs, onRefresh }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tenderId}/generate-package`, {
        method: 'POST',
        headers: { 'x-registration-id': regId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xəta');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
      onRefresh();
    }
  };

  if (!hasTechnical && !hasPrice) return null;

  return (
    <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Təqdimat Paketi</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {generating ? 'Hazırlanır...' : 'ZIP hazırla'}
        </button>
      </div>
      <p className="mb-2 text-xs text-neutral-400">
        Texniki Təklif + Maliyyə Təklifi sənədlərini bir ZIP faylında birləşdirir (DOCX + PDF).
      </p>
      {(!hasTechnical || !hasPrice) && (
        <p className="mb-2 text-xs text-amber-400">
          ⚠ {!hasTechnical && 'Texniki Təklif hələ hazırlanmayıb. '}{!hasPrice && 'Maliyyə Təklifi hələ hazırlanmayıb.'}
          {' '}Paket yalnız mövcud sənədlərlə hazırlanacaq.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {generatedDocs.length > 0 && (
        <div className="mt-3 space-y-2">
          {generatedDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-neutral-900 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.file_name}</p>
                <p className="text-xs text-neutral-500">{new Date(doc.created_at).toLocaleString('az-AZ')}</p>
              </div>
              {doc.download_url && (
                <a href={doc.download_url} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                  ZIP endir
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceSchedule({ tenderId, regId, generatedDocs, onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ description: '', unit: 'ədəd', quantity: 1, unit_price: '' });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    if (!regId) return;
    const res = await fetch(`/api/tenders/${tenderId}/price-items`, { headers: { 'x-registration-id': regId } });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [tenderId, regId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    await fetch(`/api/tenders/${tenderId}/price-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
      body: JSON.stringify(form),
    });
    setForm({ description: '', unit: 'ədəd', quantity: 1, unit_price: '' });
    fetchItems();
  };

  const handleUpdatePrice = async (itemId, unit_price) => {
    await fetch(`/api/tenders/${tenderId}/price-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
      body: JSON.stringify({ unit_price: unit_price === '' ? null : parseFloat(unit_price) }),
    });
    fetchItems();
  };

  const handleDeleteItem = async (itemId) => {
    await fetch(`/api/tenders/${tenderId}/price-items/${itemId}`, { method: 'DELETE', headers: { 'x-registration-id': regId } });
    fetchItems();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tenderId}/generate-price-schedule`, {
        method: 'POST',
        headers: { 'x-registration-id': regId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xəta');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
      onRefresh();
    }
  };

  const grandTotal = items.reduce((sum, i) => sum + (i.unit_price ? Number(i.quantity) * Number(i.unit_price) : 0), 0);
  const allPriced = items.length > 0 && items.every((i) => i.unit_price !== null);

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Maliyyə Təklifi (FORMA 2)</h2>
        <button
          onClick={handleGenerate}
          disabled={generating || !allPriced}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {generating ? 'Hazırlanır...' : 'Cədvəli hazırla'}
        </button>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        Qiymətlər AI tərəfindən yaradılmır — birbaşa sənin daxil etdiyin rəqəmlərdir. Kataloqdakı adlarla uyğun gəlirsə, qiymət avtomatik təklif olunur (dəyişə bilərsən).
      </p>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleAddItem} className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:grid-cols-5">
        <input className="input col-span-2 sm:col-span-2" placeholder="Təsvir" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <input className="input" placeholder="Ölçü" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        <input type="number" className="input" placeholder="Miqdar" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
        <button type="submit" className="rounded-lg bg-neutral-700 px-2 py-2 text-xs font-medium text-white">+ Sətir</button>
      </form>

      {!loading && items.length === 0 && <p className="text-sm text-neutral-500">Hələ sətir əlavə edilməyib.</p>}

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2.5 text-xs">
              <span className="w-5 shrink-0 text-neutral-500">{item.item_no}</span>
              <span className="flex-1 truncate">{item.description}</span>
              <span className="w-14 shrink-0 text-neutral-500">{item.unit}</span>
              <span className="w-10 shrink-0 text-neutral-500">×{item.quantity}</span>
              <input
                type="number"
                defaultValue={item.unit_price ?? ''}
                placeholder="qiymət"
                onBlur={(e) => handleUpdatePrice(item.id, e.target.value)}
                className="input w-20 shrink-0 py-1 text-xs"
              />
              {item.matched_product_id && <span className="shrink-0 text-[10px] text-emerald-400" title="Kataloqdan təklif olunub">📋</span>}
              <button onClick={() => handleDeleteItem(item.id)} className="shrink-0 text-red-400">✕</button>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-neutral-900 p-3">
            <span className="text-sm text-neutral-400">Yekun cəm:</span>
            <span className="text-lg font-bold text-indigo-400">{grandTotal.toFixed(2)} AZN</span>
          </div>
          {!allPriced && <p className="text-xs text-amber-400">⚠ Bütün sətirlərə qiymət daxil edilməyib — cədvəl hazırlana bilməz.</p>}
        </div>
      )}

      {generatedDocs.length > 0 && (
        <div className="mt-4 space-y-2">
          {generatedDocs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.file_name}</p>
                  <p className="text-xs text-neutral-500">{new Date(doc.created_at).toLocaleString('az-AZ')}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {doc.download_url && <a href={doc.download_url} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">DOCX</a>}
                  {doc.download_url_pdf && <a href={doc.download_url_pdf} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white">PDF</a>}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">Qiymətlər birbaşa sənin daxil etdiyin datadan — AI generasiyası deyil, amma yenə də təqdim etməzdən əvvəl yoxla.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VerificationBadge({ status, issues, error }) {
  if (error) {
    return <p className="mt-0.5 text-[11px] text-red-400">Verification xətası: {error}</p>;
  }
  if (!status || status === 'not_verified') {
    return <p className="mt-0.5 text-[11px] text-neutral-500">Yoxlanılmayıb</p>;
  }
  if (status === 'passed') {
    return <p className="mt-0.5 text-[11px] text-emerald-400">✓ Final yoxlamadan keçdi, problem tapılmadı</p>;
  }
  const criticalCount = (issues || []).filter((i) => i.severity === 'critical').length;
  return (
    <p className="mt-0.5 text-[11px] text-amber-400">
      ⚠ {issues?.length || 0} qeyd tapıldı{criticalCount > 0 ? ` (${criticalCount} kritik)` : ''}
    </p>
  );
}

function IssueSeverityTag({ severity }) {
  const map = {
    critical: ['KRİTİK', 'text-red-400'],
    high: ['YÜKSƏK', 'text-orange-400'],
    medium: ['ORTA', 'text-amber-400'],
    low: ['AŞAĞI', 'text-neutral-500'],
  };
  const [label, cls] = map[severity] || [severity, 'text-neutral-500'];
  return <span className={`font-semibold ${cls}`}>[{label}]</span>;
}

function TenderNumberField({ tenderId, regId, value, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tenders/${tenderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-registration-id': regId },
        body: JSON.stringify({ tender_number: val }),
      });
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <input
          className="input max-w-[200px] text-sm"
          placeholder="Tender/müsabiqə nömrəsi"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
        <button onClick={handleSave} disabled={saving} className="text-xs text-emerald-400">Saxla</button>
        <button onClick={() => setEditing(false)} className="text-xs text-neutral-500">Ləğv et</button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="mt-1 text-xs text-neutral-500 hover:text-neutral-300">
      {value ? `Tender №: ${value}` : '+ Tender nömrəsi əlavə et'}
    </button>
  );
}

function DeadlineCountdown({ deadline }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // hər dəqiqə yenilə
    return () => clearInterval(interval);
  }, []);

  const target = new Date(deadline).getTime();
  const diffMs = target - now;
  const dateLabel = new Date(deadline).toLocaleDateString('az-AZ');

  if (diffMs <= 0) {
    return (
      <p className="mt-1 text-sm font-medium text-red-400">
        ⚠ Son tarix keçib ({dateLabel})
      </p>
    );
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isCritical = days < 3;

  return (
    <p className={`mt-1 text-sm font-medium ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
      {isCritical && '⚠ '}
      Son tarix: {dateLabel} · {days} gün {hours} saat qalıb
    </p>
  );
}

function BidDecisionPanel({ requirements, readinessScore, deadline }) {
  const risks = computeRisks(requirements);
  const summary = summarizeRisks(risks);
  const daysUntilDeadline = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const { recommendation, reasons } = computeBidRecommendation(
    risks,
    typeof readinessScore === 'number' ? readinessScore : null,
    daysUntilDeadline
  );

  const recMap = {
    YES: { label: 'BƏLİ', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    REVIEW: { label: 'NƏZƏRDƏN KEÇİR', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    NO: { label: 'YOX', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  };
  const rec = recMap[recommendation];

  return (
    <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Tenderə qatılaqmı?</span>
        <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${rec.cls}`}>{rec.label}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className="text-xs text-neutral-400">• {r}</li>
        ))}
      </ul>

      {(summary.critical > 0 || summary.high > 0 || summary.medium > 0 || summary.low > 0) && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-neutral-800 pt-3">
          {summary.critical > 0 && <RiskCount label="Kritik" count={summary.critical} cls="text-red-400" />}
          {summary.high > 0 && <RiskCount label="Yüksək" count={summary.high} cls="text-orange-400" />}
          {summary.medium > 0 && <RiskCount label="Orta" count={summary.medium} cls="text-amber-400" />}
          {summary.low > 0 && <RiskCount label="Aşağı" count={summary.low} cls="text-neutral-500" />}
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-600">
        Bu, qərar-dəstək vasitəsidir, zəmanət deyil — son qərarı sən verməlisən.
      </p>
    </div>
  );
}

function RiskCount({ label, count, cls }) {
  return (
    <span className={`text-xs ${cls}`}>
      <span className="font-bold">{count}</span> {label}
    </span>
  );
}

function ReadinessScoreCard({ score, breakdown }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Tender Readiness</span>
        <span className={`text-2xl font-bold ${color}`}>{score}%</span>
      </div>
      {breakdown && (
        <div className="mt-3 space-y-1.5">
          {Object.entries(breakdown).map(([cat, pct]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-neutral-500">{cat}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-neutral-500">{pct}%</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-neutral-600">
        Düstur: hər kateqoriyada məcburi tələblərin neçə faizi uyğundur (uyğunluq yoxlamasına əsaslanır).
      </p>
    </div>
  );
}

function MissingMandatoryList({ requirements }) {
  const problematic = requirements.filter(
    (r) => r.mandatory && ['missing', 'non_compliant', 'partially_compliant'].includes(r.status)
  );

  if (problematic.length === 0) return null;

  const statusLabels = {
    missing: 'Məlumat yoxdur',
    non_compliant: 'Uyğun deyil',
    partially_compliant: 'Qismən uyğun',
  };

  return (
    <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h3 className="mb-2 text-sm font-semibold text-amber-400">
        ⚠ Diqqət tələb edən icbari tələblər ({problematic.length})
      </h3>
      <p className="mb-3 text-xs text-neutral-400">
        Bu tələblər MƏCBURİdir və hazırda şirkət profilində təsdiqlənməyib. Tenderə qatılmadan əvvəl həll edilməlidir.
      </p>
      <ul className="space-y-1.5">
        {problematic.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-400 shrink-0">
              {statusLabels[r.status]}
            </span>
            <span className="text-neutral-300">{r.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OcrBadge({ status }) {
  const map = {
    pending: ['Gözləyir', 'text-neutral-500'],
    processing: ['İşlənir...', 'text-amber-400'],
    done: ['Analiz olunub', 'text-emerald-400'],
    failed: ['Xəta', 'text-red-400'],
  };
  const [label, cls] = map[status] || [status, 'text-neutral-500'];
  return <span className={`text-xs ${cls}`}>{label}</span>;
}

function ConfidenceBadge({ confidence }) {
  const map = {
    high: ['Yüksək etibar', 'text-emerald-400'],
    medium: ['Orta etibar', 'text-amber-400'],
    low: ['Aşağı etibar', 'text-red-400'],
  };
  const [label, cls] = map[confidence] || [null, ''];
  if (!label) return null;
  return <span className={`text-[10px] ${cls}`}>{label}</span>;
}

function ComplianceBadge({ status }) {
  const map = {
    needs_review: ['Yoxlanılmalıdır', 'bg-neutral-700 text-neutral-300'],
    compliant: ['✓ Uyğundur', 'bg-emerald-500/15 text-emerald-400'],
    partially_compliant: ['~ Qismən uyğun', 'bg-amber-500/15 text-amber-400'],
    non_compliant: ['✗ Uyğun deyil', 'bg-red-500/15 text-red-400'],
    missing: ['Məlumat yoxdur', 'bg-neutral-700 text-neutral-400'],
    not_applicable: ['Aidiyyatı yoxdur', 'bg-neutral-800 text-neutral-500'],
  };
  const [label, cls] = map[status] || [null, ''];
  if (!label) return null;
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

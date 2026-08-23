'use client';

import Footer from '@/components/Footer';

const FEATURES = [
  {
    icon: 'doc',
    title: 'Sənədləri avtomatik analiz edir',
    desc: 'Tender sənədlərini oxuyur, tələbləri çıxarır, kateqoriyalaşdırır.',
  },
  {
    icon: 'target',
    title: 'Uyğunluğu yoxlayır',
    desc: 'Şirkət profilinlə tender tələblərini müqayisə edir, çatışmazlığı göstərir.',
  },
  {
    icon: 'file-check',
    title: 'Sənədləri hazırlayır',
    desc: 'Texniki təklif və qiymət cədvəlini rəsmi formata uyğun yaradır.',
  },
  {
    icon: 'clock',
    title: 'Vaxtına qənaət edirsən',
    desc: 'Əl ilə görülən işi azaldır, sən əsas qərarlara fokuslanırsan.',
  },
];

export default function Hero({ onStart, onLogin }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950">
      {/* Ambient glow background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.25), transparent), radial-gradient(ellipse 60% 40% at 85% 30%, rgba(16,185,129,0.15), transparent)',
        }}
      />

      <div className="relative mx-auto max-w-lg px-6 pb-10 pt-14">
        {/* Wordmark */}
        <h1 className="text-5xl font-black tracking-tight text-neutral-50">
          TENDER{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Avtomatlaşdırılmış tender platforması
        </p>

        {/* Value proposition */}
        <p className="mt-8 text-xl font-medium leading-snug text-neutral-100">
          Tender proseslərini AI ilə sürətləndir,{' '}
          <span className="text-emerald-400">diqqətini əsl işə yönəlt.</span>
        </p>

        {/* Features */}
        <div className="mt-10 space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
                <FeatureIcon name={f.icon} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-100">{f.title}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="mt-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-base font-semibold text-neutral-950 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]"
        >
          Başla
        </button>

        <button
          onClick={onLogin}
          className="mt-3 w-full rounded-xl border border-neutral-800 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-100"
        >
          Artıq hesabım var — Giriş
        </button>

        {/* Trust row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-neutral-600">
          <TrustBadge icon="lock" label="Təhlükəsiz" />
          <TrustBadge icon="cloud" label="Bulud əsaslı" />
          <TrustBadge icon="shield" label="Sənədlərin təhlükəsizliyi" />
        </div>
      </div>

      <Footer />
    </div>
  );
}

function TrustBadge({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <FeatureIcon name={icon} small />
      {label}
    </span>
  );
}

function FeatureIcon({ name, small }) {
  const size = small ? 13 : 18;
  const stroke = small ? 'currentColor' : '#10B981';
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (name) {
    case 'doc':
      return (
        <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></svg>
      );
    case 'target':
      return (
        <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
      );
    case 'file-check':
      return (
        <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9.5 14.5 1.5 1.5 3-3" /></svg>
      );
    case 'clock':
      return (
        <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
      );
    case 'lock':
      return (
        <svg {...common}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
      );
    case 'cloud':
      return (
        <svg {...common}><path d="M17.5 18H6a4 4 0 0 1-1-7.9A5.5 5.5 0 0 1 15.6 8a4.5 4.5 0 0 1 1.9 10z" /></svg>
      );
    case 'shield':
      return (
        <svg {...common}><path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z" /></svg>
      );
    default:
      return null;
  }
}

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const STORAGE_KEY = 'tender_ai_session';

/**
 * Domain dəyişəndə (yeni Vercel deployment/domain) localStorage sıfırlanır,
 * çünki brauzer storage-i origin-ə (domenə) bağlıdır. Bu komponent
 * "?restore=<regId>" URL parametri gələndə həmin regId-i localStorage-a
 * yazır və səhifəni təmizləyir — birdəfəlik "session bərpa linki" kimi işləyir.
 */
export default function SessionRestore() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const regId = searchParams.get('restore');
    if (regId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ regId, lastCheckedAt: 0 }));
      setRestored(true);
      setTimeout(() => {
        router.replace('/');
        window.location.reload();
      }, 1200);
    }
  }, [searchParams, router]);

  if (!restored) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
      <p className="text-sm text-emerald-400">✓ Session bərpa olundu, yüklənir...</p>
    </div>
  );
}

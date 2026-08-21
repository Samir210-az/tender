import RegistrationGate from '@/components/RegistrationGate';

export default function HomePage() {
  return (
    <RegistrationGate>
      <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold">Tender AI</h1>
          <p className="mt-2 text-neutral-400">
            Qeydiyyat və abunə sistemi aktivdir. Növbəti mərhələ: tender yükləmə və AI analiz modulu.
          </p>
        </div>
      </main>
    </RegistrationGate>
  );
}

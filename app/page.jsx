import { Suspense } from 'react';
import RegistrationGate from '@/components/RegistrationGate';
import Dashboard from '@/components/Dashboard';
import SessionRestore from '@/components/SessionRestore';

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <SessionRestore />
      </Suspense>
      <RegistrationGate>
        <Dashboard />
      </RegistrationGate>
    </>
  );
}

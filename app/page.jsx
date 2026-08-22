import RegistrationGate from '@/components/RegistrationGate';
import Dashboard from '@/components/Dashboard';

export default function HomePage() {
  return (
    <RegistrationGate>
      <Dashboard />
    </RegistrationGate>
  );
}

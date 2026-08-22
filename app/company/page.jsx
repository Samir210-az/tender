import RegistrationGate from '@/components/RegistrationGate';
import CompanyProfile from '@/components/CompanyProfile';

export default function CompanyPageRoute() {
  return (
    <RegistrationGate>
      <CompanyProfile />
    </RegistrationGate>
  );
}

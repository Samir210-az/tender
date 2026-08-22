import RegistrationGate from '@/components/RegistrationGate';
import CompanyProfile from '@/components/CompanyProfile';

export default function CompanyPage() {
  return (
    <RegistrationGate>
      <CompanyProfile />
    </RegistrationGate>
  );
}

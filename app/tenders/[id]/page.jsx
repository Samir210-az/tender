import RegistrationGate from '@/components/RegistrationGate';
import TenderDetail from '@/components/TenderDetail';

export default async function TenderPage({ params }) {
  const { id } = await params;
  return (
    <RegistrationGate>
      <TenderDetail tenderId={id} />
    </RegistrationGate>
  );
}

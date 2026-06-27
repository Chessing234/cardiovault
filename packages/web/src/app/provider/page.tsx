import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { ProviderPortal } from '@/components/provider/ProviderPortal';

export default function ProviderPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <h1 className="mb-2 text-3xl font-bold text-white">Provider portal</h1>
        <p className="mb-6 max-w-2xl text-gray-400">
          High-trust view of patients who have granted scope-limited access. Data is illustrative
          for the hackathon demo.
        </p>
        <ProviderPortal />
      </AuthGuard>
    </DashboardLayout>
  );
}

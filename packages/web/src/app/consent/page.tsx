import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { ConsentManager } from '@/components/consent/ConsentManager';

export default function ConsentPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <h1 className="mb-2 text-3xl font-bold text-white">Consent management</h1>
        <p className="mb-6 text-gray-400">
          Control who can access your health data and for what purpose
        </p>
        <ConsentManager />
      </AuthGuard>
    </DashboardLayout>
  );
}

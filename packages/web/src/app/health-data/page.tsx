import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { HealthDataForm } from '@/components/health/HealthDataForm';

export default function HealthDataPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <div className="max-w-2xl">
          <h1 className="mb-2 text-3xl font-bold text-white">Health data</h1>
          <p className="mb-6 text-gray-400">
            Enter your vitals for AI-powered risk assessment
          </p>
          <HealthDataForm />
        </div>
      </AuthGuard>
    </DashboardLayout>
  );
}

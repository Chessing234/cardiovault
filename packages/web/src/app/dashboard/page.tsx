import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { HealthIdentityCard } from '@/components/identity/HealthIdentityCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RiskChart } from '@/components/dashboard/RiskChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { HealthScoreRing } from '@/components/dashboard/HealthScoreRing';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-gray-400">Overview of your cardiovascular health</p>
          </div>

          <HealthIdentityCard />

          <StatsCards />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <RiskChart />
            </div>
            <div className="min-w-0">
              <HealthScoreRing />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentActivity />
            <QuickActions />
          </div>
        </div>
      </AuthGuard>
    </DashboardLayout>
  );
}

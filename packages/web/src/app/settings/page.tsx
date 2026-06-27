import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { SettingsPanels } from '@/components/settings/SettingsPanels';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <h1 className="mb-2 text-3xl font-bold text-white">Settings</h1>
        <p className="mb-6 text-gray-400">Profile, notifications, and wallet session details.</p>
        <SettingsPanels />
      </AuthGuard>
    </DashboardLayout>
  );
}

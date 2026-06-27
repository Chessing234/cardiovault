import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { RiskWorkspace } from '@/components/risk/RiskWorkspace';

export default function RiskPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Risk assessment</h1>
          <p className="text-gray-400">
            Run a structured assessment with the circuit-aligned model, then generate and submit a real Groth16 proof on-chain.
          </p>
        </div>
        <div className="mt-6">
          <RiskWorkspace />
        </div>
      </AuthGuard>
    </DashboardLayout>
  );
}

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { ChatInterface } from '@/components/assistant/ChatInterface';
import { Card } from '@/components/ui/card';

export default function AssistantPage() {
  return (
    <DashboardLayout>
      <AuthGuard>
        <h1 className="mb-2 text-3xl font-bold text-white">AI medical assistant</h1>
        <p className="mb-6 max-w-2xl text-gray-400">
          Ask questions about cardiovascular health. Responses are generated with retrieval from curated literature
          excerpts and include citations plus an educational disclaimer.
        </p>
        <Card className="border-gray-800 bg-cv-dark p-6">
          <ChatInterface />
        </Card>
      </AuthGuard>
    </DashboardLayout>
  );
}

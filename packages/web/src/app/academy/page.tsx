'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { ModuleCard } from '@/components/academy/ModuleCard';
import { ProgressTracker } from '@/components/academy/ProgressTracker';
import { useAcademyProgress } from '@/components/academy/AcademyProgressProvider';
import { ACADEMY_MODULES } from '@/lib/academy-data';
import { Card } from '@/components/ui/card';
import { GraduationCap, Link2 } from 'lucide-react';

export default function AcademyPage() {
  const { progress, hydrated } = useAcademyProgress();

  return (
    <DashboardLayout>
      <AuthGuard>
        <div className="max-w-5xl">
          <div className="mb-2 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 shrink-0 text-cv-teal" />
            <h1 className="text-3xl font-bold text-white">CardioVault Academy</h1>
          </div>
          <p className="mb-6 text-gray-400">
            Learn about cardiovascular health through interactive lessons and quizzes. Earn Heart
            Points and track your progress — built for educational innovation and EdTech demos.
          </p>

          {!hydrated ? (
            <div className="mb-8 h-32 animate-pulse rounded-lg border border-gray-800 bg-cv-dark/50" />
          ) : (
            <ProgressTracker progress={progress} />
          )}

          <Card className="mb-6 border-cv-teal/30 bg-cv-teal/5 p-4 sm:flex sm:items-start sm:gap-3">
            <Link2 className="mt-0.5 hidden h-5 w-5 shrink-0 text-cv-teal sm:block" />
            <div>
              <p className="text-sm font-semibold text-cv-teal">Blockchain credentials (coming soon)</p>
              <p className="mt-1 text-sm text-gray-400">
                Your achievements will be minted as soulbound tokens so progress is verifiable on-chain
                — placeholder for future wallet integration.
              </p>
            </div>
          </Card>

          <h2 className="mb-4 text-xl font-semibold text-white">Learning modules</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ACADEMY_MODULES.map((academyModule, index) => {
              const prev = index > 0 ? ACADEMY_MODULES[index - 1] : null;
              const prevDone =
                !prev ||
                prev.lessons.every((l) => progress.completedLessons.includes(l.id));
              const isLocked = index > 0 && !prevDone;

              return (
                <ModuleCard
                  key={academyModule.id}
                  module={academyModule}
                  completedLessons={progress.completedLessons}
                  isLocked={isLocked}
                />
              );
            })}
          </div>
        </div>
      </AuthGuard>
    </DashboardLayout>
  );
}

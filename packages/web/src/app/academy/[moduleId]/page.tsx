'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { useAcademyProgress } from '@/components/academy/AcademyProgressProvider';
import { getModuleById } from '@/lib/academy-data';
import { CheckCircle, Play } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ModulePage() {
  const { moduleId } = useParams();
  const academyModule = getModuleById(moduleId as string);
  const { progress } = useAcademyProgress();

  if (!academyModule) {
    return (
      <DashboardLayout>
        <AuthGuard>
          <p className="text-white">Module not found.</p>
        </AuthGuard>
      </DashboardLayout>
    );
  }

  const completedInModule = academyModule.lessons.filter((l) =>
    progress.completedLessons.includes(l.id)
  ).length;
  const moduleProgress =
    academyModule.lessons.length > 0
      ? (completedInModule / academyModule.lessons.length) * 100
      : 0;

  return (
    <DashboardLayout>
      <AuthGuard>
        <div className="max-w-3xl px-1 sm:px-0">
          <Link
            href="/academy"
            className="mb-4 block text-sm text-cv-teal hover:text-teal-300"
          >
            Back to Academy
          </Link>

          <h1 className="mb-2 text-3xl font-bold text-white">{academyModule.title}</h1>
          <p className="mb-6 text-gray-400">{academyModule.description}</p>

          <Progress value={moduleProgress} className="mb-8 h-2 bg-gray-800" />

          <div className="space-y-3">
            {academyModule.lessons.map((lesson, index) => {
              const isCompleted = progress.completedLessons.includes(lesson.id);
              return (
                <Link key={lesson.id} href={`/academy/lesson/${lesson.id}`} className="block">
                  <div className="flex items-center gap-4 rounded-lg border border-gray-800 bg-cv-dark p-4 transition-colors hover:border-gray-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 font-bold text-white">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white">{lesson.title}</h3>
                      <p className="text-sm text-gray-500">{lesson.estimatedMinutes} min</p>
                    </div>
                    <Play className="h-5 w-5 shrink-0 text-gray-500" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </AuthGuard>
    </DashboardLayout>
  );
}

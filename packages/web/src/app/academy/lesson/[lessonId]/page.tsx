'use client';

import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { LessonView } from '@/components/academy/LessonView';
import { useAcademyProgress } from '@/components/academy/AcademyProgressProvider';
import { getLessonById, getModuleById } from '@/lib/academy-data';

export default function LessonPage() {
  const { lessonId } = useParams();
  const router = useRouter();
  const lesson = getLessonById(lessonId as string);
  const { progress, completeLesson } = useAcademyProgress();

  if (!lesson) {
    return (
      <DashboardLayout>
        <AuthGuard>
          <p className="text-white">Lesson not found.</p>
        </AuthGuard>
      </DashboardLayout>
    );
  }

  const academyModule = getModuleById(lesson.moduleId);

  const handleComplete = (id: string, score: number) => {
    completeLesson(id, lesson.quiz.id, score, lesson.heartPoints);
  };

  const handleBack = () => {
    router.push(`/academy/${lesson.moduleId}`);
  };

  const handleNext = () => {
    const currentIndex = academyModule?.lessons.findIndex((l) => l.id === lesson.id) ?? -1;
    const nextLesson = academyModule?.lessons[currentIndex + 1];
    if (nextLesson) {
      router.push(`/academy/lesson/${nextLesson.id}`);
    } else {
      router.push(`/academy/${lesson.moduleId}`);
    }
  };

  return (
    <DashboardLayout>
      <AuthGuard>
        <LessonView
          lesson={lesson}
          progress={progress}
          onComplete={handleComplete}
          onBack={handleBack}
          onNext={handleNext}
        />
      </AuthGuard>
    </DashboardLayout>
  );
}

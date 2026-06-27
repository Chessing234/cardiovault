'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProgress } from '@/lib/academy-data';

const STORAGE_KEY = 'cardiovault-academy-progress';

const emptyProgress: UserProgress = {
  completedLessons: [],
  quizScores: {},
  totalHeartPoints: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: '',
};

function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return emptyProgress;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress;
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    return {
      ...emptyProgress,
      ...parsed,
      completedLessons: Array.isArray(parsed.completedLessons)
        ? parsed.completedLessons
        : [],
      quizScores:
        parsed.quizScores && typeof parsed.quizScores === 'object'
          ? parsed.quizScores
          : {},
    };
  } catch {
    return emptyProgress;
  }
}

function nextStreakFields(prev: UserProgress): Pick<
  UserProgress,
  'currentStreak' | 'longestStreak' | 'lastActivityDate'
> {
  const today = new Date().toISOString().slice(0, 10);
  const last = prev.lastActivityDate ? prev.lastActivityDate.slice(0, 10) : '';

  if (last === today) {
    return {
      currentStreak: prev.currentStreak,
      longestStreak: prev.longestStreak,
      lastActivityDate: prev.lastActivityDate,
    };
  }

  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);

  let currentStreak = 1;
  if (last === yesterday) {
    currentStreak = Math.max(1, prev.currentStreak + 1);
  }

  const longestStreak = Math.max(prev.longestStreak, currentStreak);
  return {
    currentStreak,
    longestStreak,
    lastActivityDate: new Date().toISOString(),
  };
}

type AcademyProgressContextValue = {
  progress: UserProgress;
  completeLesson: (lessonId: string, quizId: string, score: number, heartPoints: number) => void;
  resetProgress: () => void;
  hydrated: boolean;
};

const AcademyProgressContext = createContext<AcademyProgressContextValue | null>(null);

export function AcademyProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(emptyProgress);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, hydrated]);

  const completeLesson = useCallback(
    (lessonId: string, quizId: string, score: number, heartPoints: number) => {
      setProgress((prev) => {
        const already = prev.completedLessons.includes(lessonId);
        if (already) {
          const prevScore = prev.quizScores[quizId] ?? 0;
          return {
            ...prev,
            quizScores: { ...prev.quizScores, [quizId]: Math.max(prevScore, score) },
          };
        }
        const streak = nextStreakFields(prev);
        return {
          ...prev,
          ...streak,
          completedLessons: [...prev.completedLessons, lessonId],
          quizScores: { ...prev.quizScores, [quizId]: score },
          totalHeartPoints: prev.totalHeartPoints + heartPoints,
        };
      });
    },
    []
  );

  const resetProgress = useCallback(() => {
    setProgress(emptyProgress);
  }, []);

  const value = useMemo(
    () => ({ progress, completeLesson, resetProgress, hydrated }),
    [progress, completeLesson, resetProgress, hydrated]
  );

  return (
    <AcademyProgressContext.Provider value={value}>{children}</AcademyProgressContext.Provider>
  );
}

export function useAcademyProgress() {
  const ctx = useContext(AcademyProgressContext);
  if (!ctx) {
    throw new Error('useAcademyProgress must be used within AcademyProgressProvider');
  }
  return ctx;
}

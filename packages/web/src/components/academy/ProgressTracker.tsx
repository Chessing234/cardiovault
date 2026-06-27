'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ACADEMY_MODULES, getTotalHeartPoints, type UserProgress } from '@/lib/academy-data';
import { Flame, Heart, Target, Trophy } from 'lucide-react';

interface ProgressTrackerProps {
  progress: UserProgress;
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  const totalLessons = ACADEMY_MODULES.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedCount = progress.completedLessons.length;
  const overallProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
  const maxHp = getTotalHeartPoints();

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-gray-800 bg-cv-dark p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cv-red/10 p-2">
            <Heart className="h-5 w-5 text-cv-red" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{progress.totalHeartPoints}</p>
            <p className="text-xs text-gray-400">Heart Points</p>
            <p className="text-[10px] text-gray-600">of {maxHp} available</p>
          </div>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/10 p-2">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{progress.currentStreak}</p>
            <p className="text-xs text-gray-400">Day streak</p>
            <p className="text-[10px] text-gray-600">Best: {progress.longestStreak}</p>
          </div>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cv-teal/10 p-2">
            <Trophy className="h-5 w-5 text-cv-teal" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {completedCount}/{totalLessons}
            </p>
            <p className="text-xs text-gray-400">Lessons completed</p>
          </div>
        </div>
      </Card>

      <Card className="border-gray-800 bg-cv-dark p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cv-blue/10 p-2">
            <Target className="h-5 w-5 text-cv-blue" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{Math.round(overallProgress)}%</p>
            <Progress value={overallProgress} className="mt-1 h-2 bg-gray-800" />
            <p className="mt-1 text-[10px] text-gray-500">Overall curriculum</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

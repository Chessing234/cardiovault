'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Module, ModuleIconName } from '@/lib/academy-data';
import { Activity, Apple, ArrowRight, CheckCircle, Droplets, Heart, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MODULE_ICONS: Record<ModuleIconName, LucideIcon> = {
  Heart,
  Activity,
  Droplets,
  Apple,
};

interface ModuleCardProps {
  module: Module;
  completedLessons: string[];
  isLocked?: boolean;
}

export function ModuleCard({ module, completedLessons, isLocked }: ModuleCardProps) {
  const completedInModule = module.lessons.filter((l) => completedLessons.includes(l.id)).length;
  const progress = (completedInModule / module.lessons.length) * 100;
  const isCompleted = completedInModule === module.lessons.length;
  const IconComponent = MODULE_ICONS[module.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={cn(
          'bg-cv-dark border-gray-800 p-5 transition-all hover:border-gray-700',
          isLocked && 'opacity-60'
        )}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className={cn('rounded-xl bg-gray-800 p-3', module.color)}>
            <IconComponent className="h-6 w-6" />
          </div>
          {isCompleted && <CheckCircle className="h-5 w-5 text-green-400" />}
          {isLocked && <Lock className="h-5 w-5 text-gray-500" />}
        </div>

        <h3 className="mb-1 text-lg font-semibold text-white">{module.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm text-gray-400">{module.description}</p>

        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span>{module.lessons.length} lessons</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-cv-red" />
            {module.totalHeartPoints} HP
          </span>
        </div>

        <Progress value={progress} className="mb-4 h-2 bg-gray-800" />

        {!isLocked && (
          <Link
            href={`/academy/${module.id}`}
            className="flex items-center gap-2 text-sm text-cv-teal transition-colors hover:text-teal-300"
          >
            {isCompleted ? 'Review' : progress > 0 ? 'Continue' : 'Start Learning'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </Card>
    </motion.div>
  );
}

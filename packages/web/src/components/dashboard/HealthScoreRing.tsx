'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { useRiskData } from '@/hooks/useRiskData';

export function HealthScoreRing() {
  const { latest } = useRiskData();
  const risk = latest?.risk_score ?? null;
  const score = risk != null ? Math.max(20, Math.min(98, Math.round(100 - risk * 3.5))) : null;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (score == null) return;
    const target = circumference - (score / 100) * circumference;
    const id = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(id);
  }, [circumference, score]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#22C55E';
    if (s >= 60) return '#EAB308';
    if (s >= 40) return '#F97316';
    return '#EF4444';
  };

  const color = score != null ? getScoreColor(score) : '#6b7280';
  const status =
    score == null
      ? 'No data'
      : score >= 80
        ? 'Excellent'
        : score >= 60
          ? 'Good'
          : score >= 40
            ? 'Fair'
            : 'Needs attention';

  return (
    <Card className="border-gray-800 bg-cv-dark p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Health Score</h3>
        <p className="text-sm text-gray-400">Derived from your latest risk assessment</p>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90" aria-hidden>
            <circle cx="70" cy="70" r={radius} stroke="#1f2937" strokeWidth="10" fill="none" />
            {score != null && (
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                stroke={color}
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{score ?? '—'}</span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Status</span>
          <span className="font-medium text-green-400">{status}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Latest risk</span>
          <span className="text-white">{risk != null ? `${risk}%` : '—'}</span>
        </div>
      </div>
    </Card>
  );
}

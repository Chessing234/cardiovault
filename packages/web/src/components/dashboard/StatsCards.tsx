'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Activity, HeartPulse, ShieldCheck, TrendingDown } from 'lucide-react';
import { useRiskData } from '@/hooks/useRiskData';

export function StatsCards() {
  const { latest, history, loading } = useRiskData();

  const currentRisk = latest ? `${latest.risk_score}%` : '—';
  const assessments = history.length ? String(history.length) : '0';
  const proofCount = history.filter((h) => h.proof_commitment).length;
  const daysSince =
    latest?.created_at != null
      ? Math.max(
          0,
          Math.floor((Date.now() - Date.parse(latest.created_at)) / (24 * 60 * 60 * 1000)),
        )
      : null;

  const stats = [
    {
      label: 'Current Risk Score',
      value: currentRisk,
      change: latest ? 'Latest assessment' : 'No data yet',
      trend: 'neutral' as const,
      icon: HeartPulse,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      label: 'Assessments Taken',
      value: assessments,
      change: loading ? 'Loading…' : 'Saved to your history',
      trend: 'up' as const,
      icon: Activity,
      color: 'text-cv-blue',
      bgColor: 'bg-cv-blue/10',
    },
    {
      label: 'On-chain Proofs',
      value: String(proofCount),
      change: proofCount ? 'Verified attestations' : 'Generate from Risk page',
      trend: 'neutral' as const,
      icon: ShieldCheck,
      color: 'text-cv-teal',
      bgColor: 'bg-cv-teal/10',
    },
    {
      label: 'Days Since Last Check',
      value: daysSince != null ? String(daysSince) : '—',
      change: daysSince != null && daysSince > 14 ? 'Consider a new assessment' : 'Stay on track',
      trend: 'down' as const,
      icon: TrendingDown,
      color: 'text-cv-red',
      bgColor: 'bg-cv-red/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
        >
          <Card className="border-gray-800 bg-cv-dark p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs font-medium text-gray-400">{stat.change}</p>
              </div>
              <div className={`shrink-0 rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

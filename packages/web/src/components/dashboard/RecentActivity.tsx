'use client';

import { Card } from '@/components/ui/card';
import { Activity, Brain, FileCheck, Shield } from 'lucide-react';
import { useRiskData } from '@/hooks/useRiskData';

function timeAgo(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function RecentActivity() {
  const { history, loading } = useRiskData();

  const activities = history.slice(0, 4).map((row) => {
    if (row.proof_commitment) {
      return {
        icon: FileCheck,
        text: `ZK health proof anchored (${row.risk_score}% threshold)`,
        time: timeAgo(row.created_at),
        color: 'text-green-400',
      };
    }
    return {
      icon: Brain,
      text: `Risk assessment completed — ${row.risk_score}%`,
      time: timeAgo(row.created_at),
      color: 'text-cv-blue',
    };
  });

  const fallback = [
    {
      icon: Shield,
      text: 'Connect wallet and run your first assessment',
      time: 'Get started on the Risk page',
      color: 'text-cv-teal',
    },
  ];

  const items = activities.length ? activities : loading ? [] : fallback;

  return (
    <Card className="border-gray-800 bg-cv-dark p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Recent Activity</h3>
      <div className="space-y-4">
        {loading && items.length === 0 && (
          <p className="text-sm text-gray-500">Loading activity…</p>
        )}
        {items.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`mt-0.5 ${activity.color}`}>
              <activity.icon className="h-4 w-4 shrink-0" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white">{activity.text}</p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

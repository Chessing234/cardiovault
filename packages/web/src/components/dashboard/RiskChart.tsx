'use client';

import { Card } from '@/components/ui/card';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRiskData } from '@/hooks/useRiskData';

function formatChartDate(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function RiskChart() {
  const { trend, history, loading } = useRiskData();

  const data =
    trend.length > 0
      ? trend.map((p) => ({ date: formatChartDate(p.date), score: p.avgRisk }))
      : history
          .slice()
          .reverse()
          .map((h) => ({
            date: formatChartDate(h.created_at),
            score: h.risk_score,
          }));

  return (
    <Card className="border-gray-800 bg-cv-dark p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Risk Score Trend</h3>
        <p className="text-sm text-gray-400">
          {loading ? 'Loading history…' : data.length ? 'Your saved assessments' : 'Complete an assessment to see trends'}
        </p>
      </div>

      <div className="h-[280px] w-full min-w-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No assessment history yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                domain={[0, 'auto']}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value) => [`${Number(value)}%`, 'Risk Score']}
              />
              <ReferenceLine
                y={20}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label={{
                  value: 'High risk',
                  fill: '#f87171',
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#DC2626"
                strokeWidth={2}
                fill="url(#riskGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

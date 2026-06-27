'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface RiskHistoryRow {
  id: number;
  risk_score: number;
  model_version: string;
  created_at: string;
  proof_commitment: string | null;
  factors: Record<string, unknown>;
}

export interface RiskTrendPoint {
  date: string;
  avgRisk: number;
}

export function useRiskData() {
  const { walletAddress, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<RiskHistoryRow[]>([]);
  const [trend, setTrend] = useState<RiskTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress || !isAuthenticated) {
      setHistory([]);
      setTrend([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ walletAddress, limit: '50' });
      const trendParams = new URLSearchParams({ walletAddress, trend: 'true', days: '180' });
      const [histRes, trendRes] = await Promise.all([
        fetch(`/api/risk-assessment?${params}`, { credentials: 'include' }),
        fetch(`/api/risk-assessment?${trendParams}`, { credentials: 'include' }),
      ]);
      if (histRes.ok) {
        const data = (await histRes.json()) as { history: RiskHistoryRow[] };
        setHistory(data.history ?? []);
      }
      if (trendRes.ok) {
        const data = (await trendRes.json()) as { trend: RiskTrendPoint[] };
        setTrend(data.trend ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latest = history[0] ?? null;

  return { history, trend, latest, loading, error, refresh };
}

/**
 * In-process risk history when Aurora is not configured (local hackathon demos).
 */

export interface StoredRiskRecord {
  id: number;
  wallet_address: string;
  risk_score: number;
  factors: Record<string, unknown>;
  model_version: string;
  created_at: string;
  proof_commitment: string | null;
}

const records = new Map<string, StoredRiskRecord[]>();
let nextId = 1;

export function isAuroraConfigured(): boolean {
  return Boolean(process.env.AURORA_RESOURCE_ARN && process.env.AURORA_SECRET_ARN);
}

export function memoryStoreRiskAssessment(
  walletAddress: string,
  riskScore: number,
  factors: object,
  modelVersion: string,
  proofCommitment?: string | null,
): number {
  const wallet = walletAddress.toLowerCase();
  const row: StoredRiskRecord = {
    id: nextId++,
    wallet_address: wallet,
    risk_score: riskScore,
    factors: factors as Record<string, unknown>,
    model_version: modelVersion,
    created_at: new Date().toISOString(),
    proof_commitment: proofCommitment ?? null,
  };
  const list = records.get(wallet) ?? [];
  list.unshift(row);
  records.set(wallet, list.slice(0, 200));
  return row.id;
}

export function memoryGetRiskHistory(walletAddress: string, limit = 50): StoredRiskRecord[] {
  const wallet = walletAddress.toLowerCase();
  return (records.get(wallet) ?? []).slice(0, limit);
}

export function memoryGetRiskTrend(
  walletAddress: string,
  days: number,
): { date: string; avgRisk: number }[] {
  const wallet = walletAddress.toLowerCase();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const byDay = new Map<string, number[]>();

  for (const row of records.get(wallet) ?? []) {
    const ts = Date.parse(row.created_at);
    if (Number.isNaN(ts) || ts < cutoff) continue;
    const date = row.created_at.slice(0, 10);
    const bucket = byDay.get(date) ?? [];
    bucket.push(row.risk_score);
    byDay.set(date, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      avgRisk: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
    }));
}

export function memoryUpdateProofCommitment(
  walletAddress: string,
  recordId: number,
  proofCommitment: string,
): boolean {
  const wallet = walletAddress.toLowerCase();
  const list = records.get(wallet);
  if (!list) return false;
  const row = list.find((r) => r.id === recordId);
  if (!row) return false;
  row.proof_commitment = proofCommitment;
  return true;
}

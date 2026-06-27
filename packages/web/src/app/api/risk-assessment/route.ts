import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRiskHistory, getRiskTrend, storeRiskAssessment } from '@/lib/aurora';
import {
  isAuroraConfigured,
  memoryGetRiskHistory,
  memoryGetRiskTrend,
  memoryStoreRiskAssessment,
  memoryUpdateProofCommitment,
} from '@/lib/risk-store-memory';
import { assessHealthVitals, type HealthVitals, RISK_MODEL_VERSION } from '@/lib/risk-model';
import { recordMetric } from '@/lib/dynamodb';
import { errorJson, json, withCors } from '@/lib/api-helpers';
import { getIronAuthSession } from '@/lib/auth-session';
import { walletsMatch } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

function isEthAddress(s: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

function parseVitals(raw: unknown): HealthVitals | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const num = (key: string, fallback: number) => {
    const n = Number(v[key]);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  };
  const flag = (key: string) => (Number(v[key]) ? 1 : 0);
  return {
    age: num('age', 45),
    systolicBP: num('systolicBP', 120),
    diastolicBP: num('diastolicBP', 80),
    cholesterol: num('cholesterol', 200),
    hdl: num('hdl', 50),
    ldl: num('ldl', 130),
    bmi: num('bmi', 240),
    isSmoker: flag('isSmoker'),
    isDiabetic: flag('isDiabetic'),
    hasFamilyHistory: flag('hasFamilyHistory'),
  };
}

async function persistAssessment(
  walletAddress: string,
  riskScore: number,
  factors: object,
  modelVersion: string,
  proofCommitment?: string | null,
): Promise<number> {
  if (isAuroraConfigured()) {
    try {
      return await storeRiskAssessment(walletAddress, riskScore, factors, modelVersion, proofCommitment ?? null);
    } catch (e) {
      console.warn('Aurora store failed, using in-memory fallback', e);
    }
  }
  return memoryStoreRiskAssessment(walletAddress, riskScore, factors, modelVersion, proofCommitment ?? null);
}

async function fetchHistory(walletAddress: string, limit: number) {
  if (isAuroraConfigured()) {
    try {
      return await getRiskHistory(walletAddress, limit);
    } catch (e) {
      console.warn('Aurora history failed, using in-memory fallback', e);
    }
  }
  return memoryGetRiskHistory(walletAddress, limit);
}

async function fetchTrend(walletAddress: string, days: number) {
  if (isAuroraConfigured()) {
    try {
      return await getRiskTrend(walletAddress, days);
    } catch (e) {
      console.warn('Aurora trend failed, using in-memory fallback', e);
    }
  }
  return memoryGetRiskTrend(walletAddress, days);
}

/** POST — compute + persist risk assessment (or attach proof commitment). */
export async function POST(request: NextRequest) {
  try {
    const session = await getIronAuthSession();
    if (session.isAuthenticated !== true || !session.address) return errorJson('Unauthorized', 401);

    const body = (await request.json()) as {
      walletAddress?: string;
      riskScore?: number;
      factors?: object;
      vitals?: unknown;
      salt?: string;
      modelVersion?: string;
      proofCommitment?: string | null;
      recordId?: number;
    };
    const { walletAddress, factors, vitals, salt, modelVersion, proofCommitment, recordId } = body;
    let { riskScore } = body;

    if (!walletAddress || !isEthAddress(walletAddress)) {
      return errorJson('valid walletAddress is required', 400);
    }
    if (!walletsMatch(session.address, walletAddress)) {
      return errorJson('walletAddress does not match authenticated session', 403);
    }

    if (typeof recordId === 'number' && proofCommitment) {
      if (isAuroraConfigured()) {
        try {
          await storeRiskAssessment(walletAddress, riskScore ?? 0, factors ?? {}, modelVersion ?? RISK_MODEL_VERSION, proofCommitment);
        } catch {
          memoryUpdateProofCommitment(walletAddress, recordId, proofCommitment);
        }
      } else {
        memoryUpdateProofCommitment(walletAddress, recordId, proofCommitment);
      }
      return json({ ok: true, recordId, proofCommitment });
    }

    const parsedVitals = parseVitals(vitals ?? factors);
    if (!parsedVitals) {
      return errorJson('vitals or factors object is required', 400);
    }

    if (salt && typeof salt === 'string') {
      const assessment = assessHealthVitals(parsedVitals, salt);
      riskScore = assessment.riskPercent;
      const id = await persistAssessment(
        walletAddress,
        assessment.riskPercent,
        { ...parsedVitals, salt, riskScoreInt: assessment.riskScoreInt },
        RISK_MODEL_VERSION,
        proofCommitment ?? null,
      );
      try {
        await recordMetric('risk_assessment', walletAddress, {
          recordId: id,
          riskScore: assessment.riskPercent,
          modelVersion: RISK_MODEL_VERSION,
        });
      } catch {
        /* Dynamo optional */
      }
      return json(
        {
          id,
          walletAddress: walletAddress.toLowerCase(),
          ...assessment,
        },
        201,
      );
    }

    if (typeof riskScore !== 'number' || Number.isNaN(riskScore)) {
      return errorJson('riskScore must be a number', 400);
    }
    if (!factors || typeof factors !== 'object') {
      return errorJson('factors object is required', 400);
    }
    const version = modelVersion || RISK_MODEL_VERSION;
    const id = await persistAssessment(walletAddress, riskScore, factors, version, proofCommitment ?? null);
    try {
      await recordMetric('risk_assessment', walletAddress, { recordId: id, riskScore, modelVersion: version });
    } catch {
      /* Dynamo optional */
    }
    return json({ id, walletAddress: walletAddress.toLowerCase(), riskScore, modelVersion: version }, 201);
  } catch (e) {
    console.error(e);
    return errorJson('Failed to store risk assessment', 500);
  }
}

/** GET — history (?walletAddress=&limit=) or trend (?trend=true&walletAddress=&days=). */
export async function GET(request: NextRequest) {
  try {
    const session = await getIronAuthSession();
    if (session.isAuthenticated !== true || !session.address) return errorJson('Unauthorized', 401);

    const trend = request.nextUrl.searchParams.get('trend') === 'true';
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress || !isEthAddress(walletAddress)) {
      return errorJson('walletAddress query param is required', 400);
    }
    if (!walletsMatch(session.address, walletAddress)) {
      return errorJson('walletAddress does not match authenticated session', 403);
    }

    if (trend) {
      const days = Math.min(365, Math.max(1, Number(request.nextUrl.searchParams.get('days') ?? '30')));
      const data = await fetchTrend(walletAddress, days);
      return json({ trend: data, days });
    }

    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '50')));
    const history = await fetchHistory(walletAddress, limit);
    return json({ history, limit });
  } catch (e) {
    console.error(e);
    return errorJson('Failed to read risk data', 500);
  }
}

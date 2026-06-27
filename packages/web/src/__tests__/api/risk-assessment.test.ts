/**
 * @jest-environment node
 */

jest.mock('@/lib/auth-session', () => ({
  getIronAuthSession: jest.fn(),
}));

jest.mock('@/lib/aurora', () => ({
  storeRiskAssessment: jest.fn(),
  getRiskHistory: jest.fn(),
  getRiskTrend: jest.fn(),
}));

jest.mock('@/lib/dynamodb', () => ({
  recordMetric: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST as postRisk, GET as getRisk } from '@/app/api/risk-assessment/route';
import { getIronAuthSession } from '@/lib/auth-session';
import { storeRiskAssessment, getRiskHistory } from '@/lib/aurora';
import { TEST_HEALTH_DATA, TEST_WALLETS } from '@/lib/test-utils';

const mockAuth = getIronAuthSession as jest.MockedFunction<typeof getIronAuthSession>;
const mockStore = storeRiskAssessment as jest.MockedFunction<typeof storeRiskAssessment>;
const mockHistory = getRiskHistory as jest.MockedFunction<typeof getRiskHistory>;

describe('Risk Assessment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AURORA_RESOURCE_ARN = 'arn:aws:rds:us-east-1:123:cluster:test';
    process.env.AURORA_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123:secret:test';
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      address: TEST_WALLETS.patient1,
    } as never);
    mockStore.mockResolvedValue(101);
    mockHistory.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.AURORA_RESOURCE_ARN;
    delete process.env.AURORA_SECRET_ARN;
  });

  it('computes and stores assessment from vitals + salt', async () => {
    const body = {
      walletAddress: TEST_WALLETS.patient1,
      vitals: TEST_HEALTH_DATA.mediumRisk,
      salt: '4242424242',
    };

    const response = await postRisk(
      new NextRequest('http://localhost/api/risk-assessment', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(response.status).toBe(201);
    const data = (await response.json()) as { riskPercent: number; riskScoreInt: number };
    expect(data.riskScoreInt).toBeGreaterThan(0);
    expect(data.riskPercent).toBeGreaterThan(0);
    expect(mockStore).toHaveBeenCalled();
  });

  it('stores a risk assessment when session matches wallet', async () => {
    const body = {
      walletAddress: TEST_WALLETS.patient1,
      riskScore: 15.5,
      factors: TEST_HEALTH_DATA.mediumRisk,
      modelVersion: 'v1.0.0',
    };

    const response = await postRisk(
      new NextRequest('http://localhost/api/risk-assessment', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(response.status).toBe(201);
    expect(mockStore).toHaveBeenCalled();
  });

  it('rejects invalid risk score when using legacy payload', async () => {
    const response = await postRisk(
      new NextRequest('http://localhost/api/risk-assessment', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: TEST_WALLETS.patient1,
          riskScore: 'invalid',
          factors: TEST_HEALTH_DATA.mediumRisk,
          modelVersion: 'v1.0.0',
        }),
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce({ isAuthenticated: false } as never);

    const response = await postRisk(
      new NextRequest('http://localhost/api/risk-assessment', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: TEST_WALLETS.patient1,
          riskScore: 10,
          factors: TEST_HEALTH_DATA.lowRisk,
          modelVersion: 'v1.0.0',
        }),
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns risk history', async () => {
    const url = new URL('http://localhost/api/risk-assessment');
    url.searchParams.set('walletAddress', TEST_WALLETS.patient1);
    url.searchParams.set('limit', '10');

    const response = await getRisk(new NextRequest(url));
    expect(response.status).toBe(200);
    const data = (await response.json()) as { history: unknown[]; limit: number };
    expect(data.limit).toBe(10);
    expect(mockHistory).toHaveBeenCalled();
  });
});

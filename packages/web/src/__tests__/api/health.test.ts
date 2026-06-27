/**
 * @jest-environment node
 */

jest.mock('@/lib/aws-config', () => ({
  dynamoClient: { send: jest.fn() },
  rdsClient: { send: jest.fn() },
  TABLES: { SESSIONS: 'cv-sessions', CACHE: 'cv-cache', METRICS: 'cv-metrics' },
  AURORA_CONFIG: { resourceArn: '', secretArn: '', database: 'cv', schema: 'public' },
}));

import { dynamoClient } from '@/lib/aws-config';
import { GET as getHealth } from '@/app/api/health/route';

const send = dynamoClient.send as jest.Mock;

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns JSON with a status field', async () => {
    send.mockRejectedValue(new Error('no local Dynamo'));
    const response = await getHealth();
    const data = (await response.json()) as { status: string };
    expect(data.status).toMatch(/healthy|degraded|unhealthy/);
  });
});

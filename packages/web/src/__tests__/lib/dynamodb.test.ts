/**
 * @jest-environment node
 */

jest.mock('@/lib/aws-config', () => ({
  docClient: { send: jest.fn() },
  dynamoClient: { send: jest.fn() },
  TABLES: { SESSIONS: 'cv-sessions', CACHE: 'cv-cache', METRICS: 'cv-metrics' },
}));

import { docClient } from '@/lib/aws-config';
import { createSession, getSession } from '@/lib/dynamodb';
import { TEST_WALLETS } from '@/lib/test-utils';

const send = docClient.send as jest.Mock;

describe('DynamoDB session helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    send.mockResolvedValue({});
  });

  it('createSession sends a PutCommand without throwing', async () => {
    await expect(createSession('test-session-123', TEST_WALLETS.patient1, {})).resolves.not.toThrow();
    expect(send).toHaveBeenCalled();
  });

  it('returns null when no session item exists', async () => {
    send.mockResolvedValueOnce({});
    const result = await getSession('non-existent-session');
    expect(result).toBeNull();
  });
});

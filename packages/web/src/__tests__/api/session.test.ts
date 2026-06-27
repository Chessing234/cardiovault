/**
 * @jest-environment node
 */

import { generateNonce, createSIWEMessage, verifySIWEMessage } from '@/lib/siwe';
import { createMockSession, generateTestSIWEMessage, TEST_WALLETS } from '@/lib/test-utils';

describe('Auth & SIWE helpers', () => {
  it('generateNonce returns 32 hex chars (16 bytes)', () => {
    const n = generateNonce();
    expect(n).toHaveLength(32);
    expect(n).toMatch(/^[0-9a-f]+$/);
  });

  it('createSIWEMessage includes address and nonce', () => {
    const nonce = generateNonce();
    const msg = createSIWEMessage({
      address: TEST_WALLETS.patient1,
      chainId: 11155111,
      nonce,
    });
    expect(msg).toContain(TEST_WALLETS.patient1);
    expect(msg).toContain(nonce);
  });

  it('verifySIWEMessage rejects malformed payloads', async () => {
    const res = await verifySIWEMessage('not-a-siwe-message', '0x' + '11'.repeat(32));
    expect(res.valid).toBe(false);
  });

  it('createMockSession carries patient defaults', () => {
    const s = createMockSession({ role: 'admin' });
    expect(s.isAuthenticated).toBe(true);
    expect(s.address).toBe(TEST_WALLETS.patient1);
    expect(s.role).toBe('admin');
  });

  it('generateTestSIWEMessage includes nonce and address', () => {
    const msg = generateTestSIWEMessage(TEST_WALLETS.patient1, 'nonce1', {
      host: 'example.com',
      origin: 'https://example.com',
    });
    expect(msg).toContain('nonce1');
    expect(msg).toContain(TEST_WALLETS.patient1);
    expect(msg).toContain('example.com');
  });
});

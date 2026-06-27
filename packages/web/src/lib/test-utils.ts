/**
 * Testing utilities for CardioVault.
 * Mock data, helpers, and constants for unit / integration tests.
 */

import type { SessionData } from './session';

export const TEST_WALLETS = {
  patient1: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  patient2: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
  doctor: '0x9876543210987654321098765432109876543210' as `0x${string}`,
  admin: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba' as `0x${string}`,
};

export const TEST_HEALTH_DATA = {
  lowRisk: {
    age: 30,
    systolicBP: 115,
    diastolicBP: 75,
    cholesterol: 180,
    hdl: 60,
    ldl: 110,
    bmi: 240,
    isSmoker: 0,
    isDiabetic: 0,
    hasFamilyHistory: 0,
  },
  highRisk: {
    age: 65,
    systolicBP: 160,
    diastolicBP: 95,
    cholesterol: 280,
    hdl: 35,
    ldl: 190,
    bmi: 320,
    isSmoker: 1,
    isDiabetic: 1,
    hasFamilyHistory: 1,
  },
  mediumRisk: {
    age: 45,
    systolicBP: 135,
    diastolicBP: 85,
    cholesterol: 220,
    hdl: 45,
    ldl: 150,
    bmi: 270,
    isSmoker: 0,
    isDiabetic: 0,
    hasFamilyHistory: 1,
  },
};

export function createMockSession(overrides?: Partial<SessionData>): SessionData {
  return {
    nonce: 'test-nonce-1234567890abcdef',
    address: TEST_WALLETS.patient1,
    isAuthenticated: true,
    tokenId: 1,
    role: 'patient',
    ...overrides,
  };
}

export function generateTestSIWEMessage(
  address: string,
  nonce: string,
  opts?: { host?: string; origin?: string }
): string {
  const host = opts?.host ?? 'localhost:3000';
  const origin = opts?.origin ?? 'http://localhost:3000';
  return `${host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to CardioVault\n\nURI: ${origin}\nVersion: 1\nChain ID: 11155111\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

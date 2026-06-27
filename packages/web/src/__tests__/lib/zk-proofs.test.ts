/**
 * @jest-environment node
 */

import { calculateCommitment } from '@/lib/zk-proofs';

describe('ZK proof utilities', () => {
  const base = {
    age: 35,
    systolicBP: 120,
    diastolicBP: 80,
    cholesterol: 200,
    hdl: 50,
    ldl: 130,
    bmi: 240,
    isSmoker: 0,
    isDiabetic: 0,
    hasFamilyHistory: 0,
    salt: '0x1',
  };

  it('calculateCommitment is deterministic for identical inputs', async () => {
    const commitment1 = await calculateCommitment(base);
    const commitment2 = await calculateCommitment(base);
    expect(commitment1).toBe(commitment2);
    expect(/^\d+$/.test(commitment1)).toBe(true);
  });

  it('produces different commitments when age changes', async () => {
    const c1 = await calculateCommitment(base);
    const c2 = await calculateCommitment({ ...base, age: 36 });
    expect(c1).not.toBe(c2);
  });
});

/**
 * Client-side Groth16 helpers for CardioVault ``HealthProof.circom`` (snarkjs + circomlibjs Poseidon).
 */

import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

export interface HealthInputs {
  age: number;
  systolicBP: number;
  diastolicBP: number;
  cholesterol: number;
  hdl: number;
  ldl: number;
  bmi: number;
  isSmoker: number;
  isDiabetic: number;
  hasFamilyHistory: number;
  salt: string;
  maxRiskScore: number;
}

export interface ProofResult {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}

const POSEIDON_INPUT_ORDER: (keyof Omit<HealthInputs, 'maxRiskScore'>)[] = [
  'age',
  'systolicBP',
  'diastolicBP',
  'cholesterol',
  'hdl',
  'ldl',
  'bmi',
  'isSmoker',
  'isDiabetic',
  'hasFamilyHistory',
  'salt',
];

export function parseSaltToField(salt: string): bigint {
  const raw = salt.startsWith('0x') || salt.startsWith('0X') ? BigInt(salt) : BigInt(salt);
  const max = BigInt(1) << BigInt(252);
  if (raw < 0n || raw >= max) {
    throw new Error(`salt must be a field element in [0, 2^252)`);
  }
  return raw;
}

/** Poseidon(age, …, salt) as decimal string — must match ``HealthProof.circom`` commitment. */
export async function calculateCommitment(inputs: Omit<HealthInputs, 'maxRiskScore'>): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const salt = parseSaltToField(inputs.salt);
  const vals = POSEIDON_INPUT_ORDER.map((k) => {
    if (k === 'salt') return salt;
    return BigInt(inputs[k] as number);
  });
  const h = poseidon(vals);
  return F.toObject(h).toString();
}

/** snarkjs witness input: field elements as decimal strings (Circom signal names). */
export async function buildCircuitInput(inputs: HealthInputs): Promise<Record<string, string>> {
  const salt = parseSaltToField(inputs.salt);
  const commitment = await calculateCommitment({ ...inputs, salt: `0x${salt.toString(16)}` });
  return {
    maxRiskScore: String(inputs.maxRiskScore),
    commitment,
    age: String(inputs.age),
    systolicBP: String(inputs.systolicBP),
    diastolicBP: String(inputs.diastolicBP),
    cholesterol: String(inputs.cholesterol),
    hdl: String(inputs.hdl),
    ldl: String(inputs.ldl),
    bmi: String(inputs.bmi),
    isSmoker: String(inputs.isSmoker),
    isDiabetic: String(inputs.isDiabetic),
    hasFamilyHistory: String(inputs.hasFamilyHistory),
    salt: salt.toString(),
  };
}

export async function generateHealthProof(
  inputs: HealthInputs,
  wasmPath: string,
  zkeyPath: string,
): Promise<ProofResult> {
  const circuitInput = await buildCircuitInput(inputs);
  const { proof, publicSignals } = await groth16.fullProve(circuitInput, wasmPath, zkeyPath);
  return { proof, publicSignals };
}

export async function verifyHealthProof(
  proof: ProofResult['proof'],
  publicSignals: string[],
  verificationKey: object,
): Promise<boolean> {
  return groth16.verify(verificationKey, publicSignals, proof);
}

/**
 * ABI-encodes (A, B, C) for ``HealthProofVerifier.submitProof`` / ``verifyAndLog``.
 * Applies the G2 coordinate order expected by snarkjs-generated Solidity verifiers.
 */
export function encodeGroth16ProofBytes(proof: ProofResult['proof']): `0x${string}` {
  const a: readonly [bigint, bigint] = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b: readonly [readonly [bigint, bigint], readonly [bigint, bigint]] = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
  ];
  const c: readonly [bigint, bigint] = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  return encodeAbiParameters(parseAbiParameters('uint256[2], uint256[2][2], uint256[2]'), [a, b, c]);
}

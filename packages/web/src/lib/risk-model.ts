/**
 * Circuit-aligned cardiovascular risk model (matches `FraminghamRisk.circom` + `HealthProof.circom`).
 */

export const RISK_MODEL_VERSION = 'framingham-zk-v1';

export interface HealthVitals {
  age: number;
  systolicBP: number;
  diastolicBP: number;
  cholesterol: number;
  hdl: number;
  ldl: number;
  /** BMI × 10 (e.g. 24.0 → 240). */
  bmi: number;
  isSmoker: number;
  isDiabetic: number;
  hasFamilyHistory: number;
}

export interface RiskAssessmentPayload {
  riskScoreInt: number;
  riskPercent: number;
  vitals: HealthVitals;
  salt: string;
  modelVersion: string;
}

export function heightWeightToBmiScaled(heightCm: number, weightKg: number): number {
  const meters = heightCm / 100;
  if (meters <= 0 || weightKg <= 0) return 240;
  return Math.round((weightKg / (meters * meters)) * 10);
}

/** Integer risk score used by the ZK circuit (risk / 100). */
export function computeCircuitRiskInt(vitals: HealthVitals): number {
  const riskLin =
    vitals.age * 2 +
    vitals.systolicBP * 3 +
    vitals.cholesterol +
    vitals.ldl +
    vitals.bmi * 2 +
    vitals.isSmoker * 500 +
    vitals.isDiabetic * 300 +
    vitals.hasFamilyHistory * 200;
  const risk = riskLin - vitals.hdl * 2;
  return Math.floor(risk / 100);
}

export function computeRiskPercent(vitals: HealthVitals): number {
  const riskLin =
    vitals.age * 2 +
    vitals.systolicBP * 3 +
    vitals.cholesterol +
    vitals.ldl +
    vitals.bmi * 2 +
    vitals.isSmoker * 500 +
    vitals.isDiabetic * 300 +
    vitals.hasFamilyHistory * 200;
  const risk = riskLin - vitals.hdl * 2;
  return Math.round((risk / 100) * 10) / 10;
}

export function generateRiskSalt(): string {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return BigInt(`0x${hex}`).toString();
}

export function formToVitals(form: {
  age: string;
  systolicBP: string;
  diastolicBP: string;
  cholesterol: string;
  hdl: string;
  ldl: string;
  height: string;
  weight: string;
  isSmoker: boolean;
  isDiabetic: boolean;
  hasFamilyHistory: boolean;
}): HealthVitals {
  const height = Number(form.height) || 175;
  const weight = Number(form.weight) || 70;
  return {
    age: Math.round(Number(form.age) || 45),
    systolicBP: Math.round(Number(form.systolicBP) || 120),
    diastolicBP: Math.round(Number(form.diastolicBP) || 80),
    cholesterol: Math.round(Number(form.cholesterol) || 200),
    hdl: Math.round(Number(form.hdl) || 50),
    ldl: Math.round(Number(form.ldl) || 130),
    bmi: heightWeightToBmiScaled(height, weight),
    isSmoker: form.isSmoker ? 1 : 0,
    isDiabetic: form.isDiabetic ? 1 : 0,
    hasFamilyHistory: form.hasFamilyHistory ? 1 : 0,
  };
}

export function assessHealthVitals(vitals: HealthVitals, salt: string): RiskAssessmentPayload {
  const riskScoreInt = computeCircuitRiskInt(vitals);
  return {
    riskScoreInt,
    riskPercent: computeRiskPercent(vitals),
    vitals,
    salt,
    modelVersion: RISK_MODEL_VERSION,
  };
}

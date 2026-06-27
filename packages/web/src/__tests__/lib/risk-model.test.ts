import { assessHealthVitals, computeCircuitRiskInt, formToVitals } from '@/lib/risk-model';

describe('risk-model', () => {
  it('matches circuit Framingham weights for sample vitals', () => {
    const vitals = {
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
    };
    expect(computeCircuitRiskInt(vitals)).toBe(11);
    const result = assessHealthVitals(vitals, '4242424242');
    expect(result.riskScoreInt).toBe(11);
    expect(result.riskPercent).toBe(11.4);
  });

  it('derives BMI x10 from height and weight', () => {
    const vitals = formToVitals({
      age: '35',
      systolicBP: '120',
      diastolicBP: '80',
      cholesterol: '200',
      hdl: '50',
      ldl: '130',
      height: '175',
      weight: '70',
      isSmoker: false,
      isDiabetic: false,
      hasFamilyHistory: false,
    });
    expect(vitals.bmi).toBeGreaterThanOrEqual(220);
    expect(vitals.bmi).toBeLessThanOrEqual(240);
  });
});

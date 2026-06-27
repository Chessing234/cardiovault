'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calculator, HeartPulse } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  assessHealthVitals,
  formToVitals,
  generateRiskSalt,
  type RiskAssessmentPayload,
} from '@/lib/risk-model';

interface HealthFormData {
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
}

export interface HealthDataFormProps {
  onCalculated?: (result: RiskAssessmentPayload & { recordId?: number }) => void;
}

export function HealthDataForm({ onCalculated }: HealthDataFormProps) {
  const { walletAddress, isAuthenticated } = useAuth();
  const [form, setForm] = useState<HealthFormData>({
    age: '',
    systolicBP: '',
    diastolicBP: '',
    cholesterol: '',
    hdl: '',
    ldl: '',
    height: '',
    weight: '',
    isSmoker: false,
    isDiabetic: false,
    hasFamilyHistory: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof HealthFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !isAuthenticated) {
      toast.error('Sign in with your wallet to save assessments');
      return;
    }

    setSubmitting(true);
    try {
      const vitals = formToVitals(form);
      const salt = generateRiskSalt();
      const local = assessHealthVitals(vitals, salt);

      const res = await fetch('/api/risk-assessment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          vitals,
          salt,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Assessment failed');
      }

      const data = (await res.json()) as RiskAssessmentPayload & { id?: number };
      const result = { ...local, ...data, recordId: data.id };

      toast.success('Risk assessment saved', {
        description: `${result.riskPercent}% estimated 10-year cardiovascular risk (circuit-aligned model).`,
      });
      onCalculated?.(result);
    } catch (err) {
      toast.error('Could not calculate risk', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-cv-red focus-visible:ring-cv-red/20';

  return (
    <Card className="border-gray-800 bg-cv-dark p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
            <HeartPulse className="h-4 w-4 text-cv-red" aria-hidden />
            Demographics
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-gray-300">
                Age
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="35"
                value={form.age}
                onChange={(e) => updateField('age', e.target.value)}
                className={inputClass}
                min={18}
                max={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height" className="text-gray-300">
                Height (cm)
              </Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                value={form.height}
                onChange={(e) => updateField('height', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="weight" className="text-gray-300">
                Weight (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                value={form.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-white">Blood pressure & cholesterol</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sys" className="text-gray-300">
                Systolic BP (mmHg)
              </Label>
              <Input
                id="sys"
                type="number"
                placeholder="120"
                value={form.systolicBP}
                onChange={(e) => updateField('systolicBP', e.target.value)}
                className={inputClass}
                min={70}
                max={250}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia" className="text-gray-300">
                Diastolic BP (mmHg)
              </Label>
              <Input
                id="dia"
                type="number"
                placeholder="80"
                value={form.diastolicBP}
                onChange={(e) => updateField('diastolicBP', e.target.value)}
                className={inputClass}
                min={40}
                max={150}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chol" className="text-gray-300">
                Total cholesterol (mg/dL)
              </Label>
              <Input
                id="chol"
                type="number"
                placeholder="200"
                value={form.cholesterol}
                onChange={(e) => updateField('cholesterol', e.target.value)}
                className={inputClass}
                min={100}
                max={600}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hdl" className="text-gray-300">
                HDL cholesterol (mg/dL)
              </Label>
              <Input
                id="hdl"
                type="number"
                placeholder="50"
                value={form.hdl}
                onChange={(e) => updateField('hdl', e.target.value)}
                className={inputClass}
                min={10}
                max={200}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ldl" className="text-gray-300">
                LDL cholesterol (mg/dL)
              </Label>
              <Input
                id="ldl"
                type="number"
                placeholder="130"
                value={form.ldl}
                onChange={(e) => updateField('ldl', e.target.value)}
                className={inputClass}
                min={20}
                max={400}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-white">Risk factors</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-800/50 p-3">
              <div className="min-w-0">
                <Label htmlFor="smoker" className="text-white">
                  Smoker
                </Label>
                <p className="text-xs text-gray-400">Current or former smoker</p>
              </div>
              <Switch
                id="smoker"
                checked={form.isSmoker}
                onCheckedChange={(v) => updateField('isSmoker', v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-800/50 p-3">
              <div className="min-w-0">
                <Label htmlFor="diabetic" className="text-white">
                  Diabetic
                </Label>
                <p className="text-xs text-gray-400">Type 1 or Type 2 diabetes</p>
              </div>
              <Switch
                id="diabetic"
                checked={form.isDiabetic}
                onCheckedChange={(v) => updateField('isDiabetic', v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-800/50 p-3">
              <div className="min-w-0">
                <Label htmlFor="family" className="text-white">
                  Family history
                </Label>
                <p className="text-xs text-gray-400">Heart disease in immediate family</p>
              </div>
              <Switch
                id="family"
                checked={form.hasFamilyHistory}
                onCheckedChange={(v) => updateField('hasFamilyHistory', v)}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !isAuthenticated}
          className="w-full bg-cv-red py-6 text-lg font-semibold text-white hover:bg-red-700"
        >
          {submitting ? (
            'Calculating...'
          ) : (
            <>
              <Calculator className="mr-2 h-5 w-5" aria-hidden />
              Calculate risk score
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HealthDataForm } from '@/components/health/HealthDataForm';
import { HealthIdentityCard } from '@/components/identity/HealthIdentityCard';
import { useAuth } from '@/hooks/useAuth';
import { useHealthIdentity } from '@/hooks/useHealthIdentity';
import { useHealthIdentityActions } from '@/hooks/useHealthIdentityActions';
import type { RiskAssessmentPayload } from '@/lib/risk-model';
import { calculateCommitment } from '@/lib/zk-proofs';
import { KeyRound, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function riskTone(pct: number) {
  if (pct < 10) return 'text-green-400';
  if (pct < 18) return 'text-yellow-400';
  return 'text-cv-red';
}

type ZkStep = 'idle' | 'proving' | 'submitting' | 'done' | 'error';

export function RiskWorkspace() {
  const { walletAddress } = useAuth();
  const { hasIdentity, tokenId } = useHealthIdentity();
  const { submitHealthProof, isPending, txHash } = useHealthIdentityActions();
  const [assessment, setAssessment] = useState<(RiskAssessmentPayload & { recordId?: number }) | null>(null);
  const [zkStep, setZkStep] = useState<ZkStep>('idle');
  const [commitment, setCommitment] = useState<string | null>(null);
  const [zkError, setZkError] = useState<string | null>(null);

  const runZkProof = async () => {
    if (!assessment || !walletAddress) return;
    if (!hasIdentity || tokenId == null || tokenId === 0n) {
      toast.error('Create your health identity first', {
        description: 'Mint the soulbound token above before submitting a proof.',
      });
      return;
    }

    setZkStep('proving');
    setZkError(null);

    try {
      const { vitals, salt, riskScoreInt } = assessment;
      const maxRiskScore = riskScoreInt;
      const inputs = {
        age: vitals.age,
        systolicBP: vitals.systolicBP,
        diastolicBP: vitals.diastolicBP,
        cholesterol: vitals.cholesterol,
        hdl: vitals.hdl,
        ldl: vitals.ldl,
        bmi: vitals.bmi,
        isSmoker: vitals.isSmoker,
        isDiabetic: vitals.isDiabetic,
        hasFamilyHistory: vitals.hasFamilyHistory,
        salt,
        maxRiskScore,
      };

      const commit = await calculateCommitment({ ...inputs });
      setCommitment(commit);
      setZkStep('submitting');

      await submitHealthProof(tokenId, inputs, assessment.recordId, walletAddress);
      setZkStep('done');
      toast.success('ZK proof verified on-chain', {
        description: 'Your risk threshold was proven without revealing raw vitals.',
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Proof generation failed';
      setZkError(message);
      setZkStep('error');
      toast.error('ZK flow failed', { description: message });
    }
  };

  return (
    <div className="space-y-6">
      <HealthIdentityCard />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
          <HealthDataForm
            onCalculated={(result) => {
              setAssessment(result);
              setZkStep('idle');
              setCommitment(null);
              setZkError(null);
            }}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            {assessment != null ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <Card className="border-gray-800 bg-cv-dark p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Assessment result</h3>
                    <Badge variant="outline" className="border-cv-teal/50 text-cv-teal">
                      {assessment.modelVersion}
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm text-gray-400">Estimated 10-year cardiovascular risk</p>
                  <p className={`text-5xl font-bold tracking-tight ${riskTone(assessment.riskPercent)}`}>
                    {assessment.riskPercent}%
                  </p>
                  <p className="mt-4 text-sm text-gray-400">
                    Score uses the same Framingham-style weights as the Groth16 circuit — ready for a
                    zero-knowledge threshold proof.
                  </p>
                  <Button
                    type="button"
                    className="mt-6 w-full gap-2 bg-cv-blue text-white hover:bg-blue-900"
                    onClick={() => void runZkProof()}
                    disabled={zkStep === 'proving' || zkStep === 'submitting' || isPending}
                  >
                    {zkStep === 'proving' || zkStep === 'submitting' || isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        {zkStep === 'proving' ? 'Generating Groth16 proof…' : 'Submitting to chain…'}
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" aria-hidden />
                        Generate ZK health proof
                      </>
                    )}
                  </Button>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-dashed border-gray-700 bg-cv-dark/50 p-8 text-center text-gray-500"
              >
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-cv-teal/60" aria-hidden />
                <p className="text-sm">
                  Submit vitals to compute a circuit-aligned risk score, then prove it on-chain without
                  revealing raw data.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {assessment != null && (
            <Card className="border-gray-800 bg-cv-dark p-5">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Zero-knowledge pipeline
              </h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${commitment || zkStep !== 'idle' ? 'bg-cv-teal' : 'bg-gray-600'}`}
                  />
                  Poseidon commitment over private vitals
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${zkStep === 'proving' || zkStep === 'submitting' || zkStep === 'done' ? 'bg-cv-teal' : 'bg-gray-600'}`}
                  />
                  Prove risk ≤ threshold (Groth16 / snarkjs)
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${zkStep === 'done' ? 'bg-green-400' : 'bg-gray-600'}`}
                  />
                  Anchor attestation on ZKProofVerifier
                </li>
              </ul>
              {commitment && (
                <p className="mt-3 truncate font-mono text-xs text-gray-500" title={commitment}>
                  Commitment: {commitment}
                </p>
              )}
              {zkStep === 'done' && txHash && (
                <p className="mt-4 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-200">
                  Proof verified on-chain.
                  <span className="mt-1 block truncate font-mono" title={txHash}>
                    {txHash}
                  </span>
                </p>
              )}
              {zkStep === 'error' && zkError && (
                <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {zkError}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

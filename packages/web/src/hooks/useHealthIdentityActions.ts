'use client';

import { useCallback, useState } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { HEALTH_IDENTITY_ABI, ZK_VERIFIER_ABI } from '@/lib/abis';
import { getContractsForChain } from '@/lib/contracts';
import type { HealthInputs } from '@/lib/zk-proofs';
import { encodeGroth16ProofBytes, generateHealthProof } from '@/lib/zk-proofs';
import { ZK_WASM_PATH, ZK_ZKEY_PATH } from '@/lib/zk-config';

const DEFAULT_CONSENT = {
  allowResearch: true,
  allowInsuranceSharing: false,
  allowEmergencyAccess: true,
  dataRetentionDays: 365n,
} as const;

export function useHealthIdentityActions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { healthIdentitySBT, zkVerifier } = getContractsForChain(chainId);
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const registerIdentity = useCallback(
    async (encryptedCid = 'QmCardioVaultProfile') => {
      if (!address) throw new Error('Connect wallet first');
      setError(null);
      return writeContractAsync({
        address: healthIdentitySBT,
        abi: HEALTH_IDENTITY_ABI,
        functionName: 'registerIdentity',
        args: [encryptedCid, DEFAULT_CONSENT],
      });
    },
    [address, healthIdentitySBT, writeContractAsync],
  );

  const submitHealthProof = useCallback(
    async (tokenId: bigint, inputs: HealthInputs, recordId?: number, walletAddress?: string) => {
      if (!address) throw new Error('Connect wallet first');
      setError(null);

      const { proof, publicSignals } = await generateHealthProof(inputs, ZK_WASM_PATH, ZK_ZKEY_PATH);
      const proofBytes = encodeGroth16ProofBytes(proof);
      const maxRiskScore = BigInt(publicSignals[0] ?? inputs.maxRiskScore);
      const commitment = BigInt(publicSignals[1] ?? 0);

      const hash = await writeContractAsync({
        address: zkVerifier,
        abi: ZK_VERIFIER_ABI,
        functionName: 'submitProof',
        args: [tokenId, maxRiskScore, commitment, proofBytes],
      });

      if (recordId && walletAddress) {
        await fetch('/api/risk-assessment', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            recordId,
            proofCommitment: `0x${commitment.toString(16).padStart(64, '0')}`,
          }),
        });
      }

      return { hash, commitment: commitment.toString(), publicSignals, proof };
    },
    [address, writeContractAsync, zkVerifier],
  );

  return {
    registerIdentity,
    submitHealthProof,
    isPending: isPending || confirming,
    isSuccess,
    txHash,
    error,
    setError,
  };
}

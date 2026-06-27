'use client';

import { useAccount, useReadContract, useChainId } from 'wagmi';
import { HEALTH_IDENTITY_ABI } from '@/lib/abis';
import { getContractsForChain } from '@/lib/contracts';

export interface HealthProfile {
  patient: `0x${string}`;
  encryptedCid: string;
  createdAt: bigint;
  lastUpdatedAt: bigint;
  isActive: boolean;
  defaultConsent: {
    allowResearch: boolean;
    allowInsuranceSharing: boolean;
    allowEmergencyAccess: boolean;
    dataRetentionDays: bigint;
  };
}

const ZERO = '0x0000000000000000000000000000000000000000';

export function useHealthIdentity() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { healthIdentitySBT } = getContractsForChain(chainId);
  const contractEnabled =
    !!address && !!healthIdentitySBT && healthIdentitySBT.toLowerCase() !== ZERO.toLowerCase();

  const { data: tokenId, isLoading: tokenLoading } = useReadContract({
    address: healthIdentitySBT,
    abi: HEALTH_IDENTITY_ABI,
    functionName: 'patientToTokenId',
    args: address ? [address] : undefined,
    query: { enabled: contractEnabled },
  });

  const { data: hasIdentity, isLoading: hasIdentityLoading } = useReadContract({
    address: healthIdentitySBT,
    abi: HEALTH_IDENTITY_ABI,
    functionName: 'hasHealthIdentity',
    args: address ? [address] : undefined,
    query: { enabled: contractEnabled },
  });

  const tid = tokenId as bigint | undefined;
  const hasToken = !!tid && tid > 0n;

  const { data: profile, isLoading: profileLoading } = useReadContract({
    address: healthIdentitySBT,
    abi: HEALTH_IDENTITY_ABI,
    functionName: 'getProfile',
    args: hasToken ? [tid] : undefined,
    query: { enabled: contractEnabled && hasToken },
  });

  const isLoading = tokenLoading || hasIdentityLoading || profileLoading;
  const p = profile as HealthProfile | undefined;

  return {
    tokenId: tid,
    hasIdentity: Boolean(hasIdentity),
    profile: p,
    isLoading,
    isRegistered: Boolean(hasIdentity) && Boolean(p?.isActive),
  };
}

import type { Abi } from 'viem';
import healthIdentityJson from '../../../contracts/artifacts/contracts/HealthIdentitySBT.sol/HealthIdentitySBT.json';
import consentManagerJson from '../../../contracts/artifacts/contracts/ConsentManager.sol/ConsentManager.json';
import dataAuditTrailJson from '../../../contracts/artifacts/contracts/DataAuditTrail.sol/DataAuditTrail.json';
import zkProofVerifierJson from '../../../contracts/artifacts/contracts/ZKProofVerifier.sol/ZKProofVerifier.json';

export const HEALTH_IDENTITY_ABI = healthIdentityJson.abi as Abi;
export const CONSENT_MANAGER_ABI = consentManagerJson.abi as Abi;
export const AUDIT_TRAIL_ABI = dataAuditTrailJson.abi as Abi;
export const ZK_VERIFIER_ABI = zkProofVerifierJson.abi as Abi;

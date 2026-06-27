const zero = '0x0000000000000000000000000000000000000000' as const;

/** Hardhat local addresses from `packages/contracts/deployed.json` after `npm run deploy:local`. */
const hardhat = {
  healthIdentitySBT: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
  consentManager: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
  auditTrail: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
  zkVerifier: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as `0x${string}`,
};

export const CONTRACT_ADDRESSES = {
  hardhat,
  sepolia: {
    healthIdentitySBT: (process.env.NEXT_PUBLIC_SEPOLIA_HEALTH_IDENTITY ??
      process.env.NEXT_PUBLIC_SEPOLA_HEALTH_IDENTITY ??
      zero) as `0x${string}`,
    consentManager: (process.env.NEXT_PUBLIC_SEPOLIA_CONSENT_MANAGER ??
      process.env.NEXT_PUBLIC_SEPOLA_CONSENT ??
      zero) as `0x${string}`,
    auditTrail: (process.env.NEXT_PUBLIC_SEPOLIA_AUDIT_TRAIL ??
      process.env.NEXT_PUBLIC_SEPOLA_AUDIT ??
      zero) as `0x${string}`,
    zkVerifier: (process.env.NEXT_PUBLIC_SEPOLIA_ZK_VERIFIER ??
      process.env.NEXT_PUBLIC_SEPOLA_ZK_VERIFIER ??
      zero) as `0x${string}`,
  },
} as const;

export function getContractsForChain(chainId: number) {
  if (chainId === 31_337) return CONTRACT_ADDRESSES.hardhat;
  return CONTRACT_ADDRESSES.sepolia;
}

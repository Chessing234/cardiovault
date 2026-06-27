import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
  '00000000000000000000000000000001';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const sepoliaRpc =
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ||
  (alchemyKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}` : undefined);

export const config = getDefaultConfig({
  appName: 'CardioVault',
  appDescription: 'Own your heartbeat. Decentralized cardiovascular health platform.',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://cardiovault.io',
  appIcon: process.env.NEXT_PUBLIC_APP_ICON ?? 'https://cardiovault.io/icon.png',
  projectId: walletConnectProjectId,
  chains: [sepolia, hardhat],
  transports: {
    [sepolia.id]: http(sepoliaRpc ?? 'https://rpc.sepolia.org'),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
});

export const SUPPORTED_CHAINS = [sepolia, hardhat] as const;
export const DEFAULT_CHAIN = sepolia;

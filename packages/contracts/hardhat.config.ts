import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-circom';

const sepoliaRpc = process.env.SEPOLIA_RPC_URL ?? '';
const deployerKey = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 10_000 },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: sepoliaRpc,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? '',
  },
  circom: {
    inputBasePath: './circom',
    ptau:
      'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau',
    circuits: [
      {
        name: 'HealthProof',
        circuit: 'HealthProof.circom',
        input: 'HealthProof_input.json',
        protocol: 'groth16',
      },
    ],
  },
};

export default config;

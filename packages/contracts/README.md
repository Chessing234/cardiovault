# CardioVault contracts

Solidity stack: Hardhat, OpenZeppelin 5, Ethers v6.

## Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | `hardhat compile` |
| `npm run test` | Full test suite |
| `npm run deploy:local` | Deploy to in-process Hardhat network |
| `npm run deploy:sepolia` | Deploy to Sepolia (`SEPOLIA_RPC_URL`, `PRIVATE_KEY`) |
| `npm run verify:contracts` | Etherscan verify using `deployed.json` |

## Deploy + verify

1. `npm run deploy:sepolia` — writes `deployed.json` at package root.
2. Set `ETHERSCAN_API_KEY`.
3. `npm run verify:contracts -- --network sepolia`

## Gas note (SBT mint)

`ERC721Enumerable` + `AccessControl` + stored health profile lands around **~330k gas** for `mintIdentity` on the Hardhat EVM. The unit test asserts `< 340k`; hitting **< 300k** on L1 typically requires dropping enumerability, shrinking on-chain metadata, or targeting an L2 with cheaper execution.

## ZK / Circom

Circuit scaffolding lives under `circom/`. Run `npx hardhat circom` when you add real circuits (see `hardhat.config.ts`).

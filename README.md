# CardioVault

Decentralized cardiovascular health platform. Monorepo layout:

| Package | Stack | Role |
|--------|--------|------|
| `packages/web` | Next.js 14, Tailwind, wagmi, RainbowKit | dApp frontend (Vercel) |
| `packages/contracts` | Hardhat, Solidity, Circom | On-chain + ZK |
| `packages/ml` | Python, PyTorch, Jupyter | Byte2Beat / Kaggle pipeline |

## Prerequisites

- Node.js **>= 18**
- npm (workspaces)
- Python **3.10+** (for `packages/ml`)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Contracts

```bash
cd packages/contracts
npm run compile
```

### ML

```bash
cd packages/ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter notebook
```

## Environment

Copy `.env.example` to `.env` / `packages/web/.env.local` as needed. Never commit secrets.

## Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server (`packages/web`) |
| `npm run build` | Production build: web + contracts |
| `npm run test` | Tests in all workspaces that define `test` |
| `npm run lint` | ESLint for `packages/web` |

## License

Private / TBD.

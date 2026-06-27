#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "CardioVault E2E Demo Flow Test"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
HARDHAT_URL="${HARDHAT_URL:-http://localhost:8545}"

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

info "Checking frontend..."
if curl -sf "$BASE_URL" > /dev/null; then
  pass "Frontend is running"
else
  fail "Frontend is not running at $BASE_URL"
fi

info "Checking API health..."
HEALTH_JSON="$(curl -sf "$BASE_URL/api/health" || true)"
if echo "$HEALTH_JSON" | grep -q '"status"'; then
  STATUS="$(echo "$HEALTH_JSON" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')"
  pass "API health check returned status: ${STATUS:-unknown}"
else
  fail "API health check failed"
fi

info "Testing auth nonce endpoint..."
NONCE_RESPONSE="$(curl -sf "$BASE_URL/api/auth/nonce" || true)"
if echo "$NONCE_RESPONSE" | grep -q '"nonce"'; then
  pass "Nonce generation works"
else
  fail "Nonce generation failed"
fi

info "Checking Hardhat network..."
if curl -sf -X POST "$HARDHAT_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q '"result"'; then
  pass "Hardhat network is running"
else
  echo -e "${YELLOW}→${NC} Hardhat network not running (optional for frontend-only demo)"
fi

info "Checking contract compilation..."
cd "$ROOT/packages/contracts"
if [[ -d artifacts ]]; then
  pass "Contracts compiled"
else
  info "Contracts not compiled, compiling now..."
  npx hardhat compile
  pass "Contracts compiled"
fi
cd "$ROOT"

info "Testing ML modules..."
cd "$ROOT/packages/ml"
if PYTHONPATH=src python3 -c "import data_loader, model, evaluate; print('OK')" 2>/dev/null; then
  pass "ML modules load correctly"
else
  fail "ML modules failed to load (run from repo root with Python 3)"
fi
cd "$ROOT"

echo ""
echo "=========================================="
echo -e "${GREEN}All E2E checks passed!${NC}"
echo "=========================================="
echo ""
echo "Demo flow ready:"
echo "  1. Connect wallet (MetaMask)"
echo "  2. Sign SIWE message"
echo "  3. Enter health data in form"
echo "  4. Submit for risk assessment"
echo "  5. View dashboard with results"
echo "  6. Generate ZK proof"
echo "  7. Ask AI medical assistant"
echo "  8. Browse CardioVault Academy"
echo "  9. Upload medical images to IPFS"
echo "  10. Manage data consent"
echo ""

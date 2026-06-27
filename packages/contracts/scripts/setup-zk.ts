/**
 * Compile HealthProof.circom, run Groth16 trusted setup (local / hackathon),
 * export verification_key.json, Solidity verifier, and copy browser artifacts to packages/web/public/zk.
 *
 * Requires: circom2 (npx), snarkjs (npx). Uses non-interactive entropy flags for snarkjs.
 * The final .zkey is large; keep it out of git (see repo .gitignore). verification_key.json is committed under circuits/build/.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const CIRCUITS = path.join(ROOT, 'circuits');
const BUILD = path.join(CIRCUITS, 'build');
const CIRCUIT_NAME = 'HealthProof';
const R1CS = path.join(BUILD, `${CIRCUIT_NAME}.r1cs`);
const WASM_DIR = path.join(BUILD, `${CIRCUIT_NAME}_js`);
const WASM = path.join(WASM_DIR, `${CIRCUIT_NAME}.wasm`);
const PTAU_0 = path.join(BUILD, 'pot12_0000.ptau');
const PTAU_1 = path.join(BUILD, 'pot12_0001.ptau');
const PTAU_FINAL = path.join(BUILD, 'pot12_final.ptau');
const ZKEY_0 = path.join(BUILD, `${CIRCUIT_NAME}_0000.zkey`);
const ZKEY_1 = path.join(BUILD, `${CIRCUIT_NAME}_0001.zkey`);
const ZKEY_FINAL = path.join(BUILD, `${CIRCUIT_NAME}_final.zkey`);
const VK_JSON = path.join(BUILD, 'verification_key.json');
const SOL_VERIFIER_OUT = path.join(ROOT, 'contracts', 'HealthProofGroth16Verifier.sol');
const WEB_ZK = path.resolve(ROOT, '..', 'web', 'public', 'zk');

function sh(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, env: process.env });
}

/** snarkjs 0.7.x sometimes emits one extra checkField for uint[3] pubSignals — remove the stray line. */
function patchGroth16VerifierSolidity(sol: string): string {
  const bad =
    /checkField\(calldataload\(add\(_pubSignals, 64\)\)\)\s*\n\s*checkField\(calldataload\(add\(_pubSignals, 96\)\)\)\s*\n/;
  const good = 'checkField(calldataload(add(_pubSignals, 64)))\n            \n';
  if (!bad.test(sol)) return sol;
  return sol.replace(bad, good);
}

async function main() {
  fs.mkdirSync(BUILD, { recursive: true });
  fs.mkdirSync(WEB_ZK, { recursive: true });

  console.log('Compiling circuit (circom2)...');
  sh(
    `npx circom2 ${path.join(CIRCUITS, `${CIRCUIT_NAME}.circom`)} --r1cs --wasm --sym -o ${BUILD}`,
  );

  if (!fs.existsSync(R1CS)) {
    throw new Error(`Missing r1cs at ${R1CS}`);
  }

  console.log('Powers of tau (bn128, 12)...');
  sh(`npx snarkjs powersoftau new bn128 12 ${PTAU_0} -v`);
  sh(`npx snarkjs powersoftau contribute ${PTAU_0} ${PTAU_1} --name=CardioVault-ptau -e=cv-ptau-entropy -v`);
  sh(`npx snarkjs powersoftau prepare phase2 ${PTAU_1} ${PTAU_FINAL} -v`);

  console.log('Groth16 phase 2...');
  sh(`npx snarkjs groth16 setup ${R1CS} ${PTAU_FINAL} ${ZKEY_0} -v`);
  sh(`npx snarkjs zkey contribute ${ZKEY_0} ${ZKEY_1} --name=CardioVault-zkey -e=cv-zkey-entropy -v`);

  fs.copyFileSync(ZKEY_1, ZKEY_FINAL);

  console.log('Export verification key + Solidity verifier...');
  sh(`npx snarkjs zkey export verificationkey ${ZKEY_FINAL} ${VK_JSON}`);
  sh(`npx snarkjs zkey export solidityverifier ${ZKEY_FINAL} ${SOL_VERIFIER_OUT}`);

  let sol = fs.readFileSync(SOL_VERIFIER_OUT, 'utf8');
  sol = patchGroth16VerifierSolidity(sol);
  fs.writeFileSync(SOL_VERIFIER_OUT, sol);

  if (!fs.existsSync(WASM)) {
    throw new Error(`Missing wasm at ${WASM}`);
  }
  fs.copyFileSync(WASM, path.join(WEB_ZK, `${CIRCUIT_NAME}.wasm`));
  fs.copyFileSync(ZKEY_FINAL, path.join(WEB_ZK, `${CIRCUIT_NAME}_final.zkey`));

  console.log('ZK setup complete.');
  console.log(`  Build: ${BUILD}`);
  console.log(`  Verifier: ${SOL_VERIFIER_OUT}`);
  console.log(`  Browser artifacts: ${WEB_ZK}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

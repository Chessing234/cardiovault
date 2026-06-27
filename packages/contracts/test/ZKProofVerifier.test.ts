import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import * as fs from 'fs';
import * as path from 'path';
import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';

const defaultConsent = {
  allowResearch: true,
  allowInsuranceSharing: false,
  allowEmergencyAccess: true,
  dataRetentionDays: 365n,
};

const WASM_PATH = path.join(__dirname, '../circuits/build/HealthProof_js/HealthProof.wasm');
const ZKEY_PATH = path.join(__dirname, '../circuits/build/HealthProof_final.zkey');
const VK_JSON_PATH = path.join(__dirname, '../circuits/build/verification_key.json');

function loadVkHash(): string {
  if (!fs.existsSync(VK_JSON_PATH)) {
    throw new Error('Missing circuits/build/verification_key.json — run `npm run zk:setup` in packages/contracts');
  }
  return ethers.keccak256(ethers.toUtf8Bytes(fs.readFileSync(VK_JSON_PATH, 'utf8')));
}

function encodeProofBytes(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): string {
  const a: [bigint, bigint] = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
  ];
  const c: [bigint, bigint] = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256[2]', 'uint256[2][2]', 'uint256[2]'],
    [a, b, c],
  );
}

async function poseidonCommitment(args: {
  age: number;
  systolicBP: number;
  diastolicBP: number;
  cholesterol: number;
  hdl: number;
  ldl: number;
  bmi: number;
  isSmoker: number;
  isDiabetic: number;
  hasFamilyHistory: number;
  salt: bigint;
}): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const h = poseidon([
    BigInt(args.age),
    BigInt(args.systolicBP),
    BigInt(args.diastolicBP),
    BigInt(args.cholesterol),
    BigInt(args.hdl),
    BigInt(args.ldl),
    BigInt(args.bmi),
    BigInt(args.isSmoker),
    BigInt(args.isDiabetic),
    BigInt(args.hasFamilyHistory),
    args.salt,
  ]);
  return F.toObject(h).toString();
}

async function proveCase(overrides: Partial<{ maxRiskScore: number; salt: bigint; age: number }> = {}) {
  const salt = overrides.salt ?? 4242424242n;
  const maxRiskScore = overrides.maxRiskScore ?? 30;
  const age = overrides.age ?? 35;
  const vitals = {
    age,
    systolicBP: 120,
    diastolicBP: 80,
    cholesterol: 200,
    hdl: 50,
    ldl: 130,
    bmi: 240,
    isSmoker: 0,
    isDiabetic: 0,
    hasFamilyHistory: 0,
    salt,
  };
  const commitment = await poseidonCommitment(vitals);
  const input = {
    maxRiskScore: String(maxRiskScore),
    commitment,
    age: String(vitals.age),
    systolicBP: String(vitals.systolicBP),
    diastolicBP: String(vitals.diastolicBP),
    cholesterol: String(vitals.cholesterol),
    hdl: String(vitals.hdl),
    ldl: String(vitals.ldl),
    bmi: String(vitals.bmi),
    isSmoker: String(vitals.isSmoker),
    isDiabetic: String(vitals.isDiabetic),
    hasFamilyHistory: String(vitals.hasFamilyHistory),
    salt: salt.toString(),
  };
  const { proof, publicSignals } = await groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
  return { proof, publicSignals, commitment, maxRiskScore, vitals, input };
}

async function zkFixture() {
  const [deployer, patient, accessor, service] = await ethers.getSigners();
  const startNonce = await ethers.provider.getTransactionCount(deployer.address);
  const predictedConsent = ethers.getCreateAddress({
    from: deployer.address,
    nonce: BigInt(startNonce + 1),
  });
  const predictedZk = ethers.getCreateAddress({
    from: deployer.address,
    nonce: BigInt(startNonce + 3),
  });

  const identity = await (await ethers.getContractFactory('HealthIdentitySBT')).deploy();
  await identity.waitForDeployment();
  const consent = await (await ethers.getContractFactory('ConsentManager')).deploy(await identity.getAddress());
  await consent.waitForDeployment();
  const audit = await (await ethers.getContractFactory('DataAuditTrail')).deploy(
    await consent.getAddress(),
    predictedZk,
  );
  await audit.waitForDeployment();
  const vkHash = loadVkHash();
  const zk = await (
    await ethers.getContractFactory('ZKProofVerifier')
  ).deploy(await identity.getAddress(), await audit.getAddress(), vkHash);
  await zk.waitForDeployment();
  await consent.setAuditTrail(await audit.getAddress());
  await identity.connect(deployer).grantRole(await identity.MINTER_ROLE(), service.address);
  await identity.connect(deployer).mintIdentity(patient.address, 'Qm', defaultConsent);
  return { identity, consent, audit, zk, deployer, patient, accessor, service, vkHash };
}

describe('ZKProofVerifier (Groth16 HealthProof)', function () {
  before(function () {
    if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH) || !fs.existsSync(VK_JSON_PATH)) {
      this.skip();
    }
  });

  describe('Deployment', function () {
    it('sets initial vk hash from verification_key.json', async function () {
      const { zk, vkHash } = await loadFixture(zkFixture);
      expect(await zk.vkHash()).to.equal(vkHash);
      expect(await zk.verificationKey()).to.equal(vkHash);
    });
  });

  describe('Groth16 prove / verify (off-chain)', function () {
    it('snarkjs verify returns true for valid witness', async function () {
      const { proof, publicSignals } = await proveCase();
      const vkey = JSON.parse(fs.readFileSync(VK_JSON_PATH, 'utf8'));
      expect(await groth16.verify(vkey, publicSignals, proof)).to.be.true;
      expect(publicSignals[0]).to.equal('1');
    });

    it('snarkjs verify fails when proof is tampered', async function () {
      const { proof, publicSignals } = await proveCase();
      const bad = structuredClone(proof) as typeof proof;
      bad.pi_a[0] = (BigInt(bad.pi_a[0]) + 1n).toString();
      const vkey = JSON.parse(fs.readFileSync(VK_JSON_PATH, 'utf8'));
      expect(await groth16.verify(vkey, publicSignals, bad)).to.be.false;
    });

    it('rejects out-of-range age at witness generation', async function () {
      await expect(proveCase({ age: 200 })).to.be.rejected;
    });
  });

  describe('On-chain verification', function () {
    it('submitProof stores commitment and emits for a valid proof', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bytes = encodeProofBytes(proof);
      const c = BigInt(commitment);
      await expect(zk.connect(patient).submitProof(1n, maxRiskScore, c, bytes)).to.emit(zk, 'ProofVerified');
      expect(await zk.verificationCount()).to.equal(1n);
      expect(await zk.lastProofCommitment(1n)).to.equal(ethers.toBeHex(c, 32));
    });

    it('verifyHealthProof view returns true and uses bounded gas', async function () {
      const { zk } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const c = BigInt(commitment);
      const bStruct = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        c: [proof.pi_c[0], proof.pi_c[1]],
      };
      expect(await zk.verifyHealthProof.staticCall(1n, maxRiskScore, c, bStruct)).to.be.true;
      const gas = await zk.verifyHealthProof.estimateGas(1n, maxRiskScore, c, bStruct);
      expect(gas).to.be.lessThan(350_000n);
    });

    it('reverts submitProof when Groth16 pairing fails (tampered proof)', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bad = structuredClone(proof) as typeof proof;
      bad.pi_c[1] = (BigInt(bad.pi_c[1]) + 1n).toString();
      const bytes = encodeProofBytes(bad);
      await expect(
        zk.connect(patient).submitProof(1n, maxRiskScore, BigInt(commitment), bytes),
      ).to.be.revertedWithCustomError(zk, 'InvalidProof');
    });

    it('reverts when maxRiskScore public input does not match proof', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bytes = encodeProofBytes(proof);
      await expect(
        zk.connect(patient).submitProof(1n, maxRiskScore + 50, BigInt(commitment), bytes),
      ).to.be.revertedWithCustomError(zk, 'InvalidProof');
    });

    it('reverts when commitment public input does not match proof', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bytes = encodeProofBytes(proof);
      await expect(
        zk.connect(patient).submitProof(1n, maxRiskScore, BigInt(commitment) + 1n, bytes),
      ).to.be.revertedWithCustomError(zk, 'InvalidProof');
    });

    it('reverts for mal-formed short proof calldata', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const { commitment, maxRiskScore } = await proveCase();
      await expect(
        zk.connect(patient).submitProof(1n, maxRiskScore, BigInt(commitment), '0xabcd'),
      ).to.be.revertedWithoutReason();
    });

    it('reverts when caller is not token owner', async function () {
      const { zk, service } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bytes = encodeProofBytes(proof);
      await expect(
        zk.connect(service).submitProof(1n, maxRiskScore, BigInt(commitment), bytes),
      ).to.be.revertedWithCustomError(zk, 'NotPatient');
    });
  });

  describe('verifyAndLog', function () {
    it('records audit event after successful verification', async function () {
      const { zk, audit, patient, accessor } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bytes = encodeProofBytes(proof);
      await zk.connect(patient).verifyAndLog(1n, maxRiskScore, BigInt(commitment), bytes, accessor.address, 'zk-check');
      expect(await audit.getEventCount()).to.equal(1n);
    });
  });

  describe('Proof status', function () {
    it('returns correct status after submission', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const { proof, commitment, maxRiskScore } = await proveCase();
      const bytes = encodeProofBytes(proof);
      const c = BigInt(commitment);
      await zk.connect(patient).submitProof(1n, maxRiskScore, c, bytes);
      const [isValid, comm, at] = await zk.getProofStatus(1n);
      expect(isValid).to.be.true;
      expect(comm).to.equal(ethers.toBeHex(c, 32));
      expect(at).to.be.greaterThan(0n);
    });
  });

  describe('Key update', function () {
    it('owner can update vk hash', async function () {
      const { zk, deployer } = await loadFixture(zkFixture);
      const nk = ethers.keccak256(ethers.toUtf8Bytes('new-key'));
      await expect(zk.connect(deployer).updateVerificationKey(nk)).to.emit(zk, 'VerifierKeyUpdated').withArgs(nk);
      expect(await zk.vkHash()).to.equal(nk);
    });

    it('non-owner cannot update key', async function () {
      const { zk, patient } = await loadFixture(zkFixture);
      const nk = ethers.keccak256(ethers.toUtf8Bytes('x'));
      await expect(zk.connect(patient).updateVerificationKey(nk)).to.be.revertedWithCustomError(
        zk,
        'OwnableUnauthorizedAccount',
      );
    });
  });

  describe('Commitment binding (circuit)', function () {
    it('fails snarkjs verify when commitment does not match private inputs', async function () {
      const salt = 999888777n;
      const vitals = {
        age: 35,
        systolicBP: 120,
        diastolicBP: 80,
        cholesterol: 200,
        hdl: 50,
        ldl: 130,
        bmi: 240,
        isSmoker: 0,
        isDiabetic: 0,
        hasFamilyHistory: 0,
        salt,
      };
      const goodCommitment = await poseidonCommitment(vitals);
      const wrongCommitment = (BigInt(goodCommitment) + 1n).toString();
      const input = {
        maxRiskScore: '30',
        commitment: wrongCommitment,
        age: String(vitals.age),
        systolicBP: String(vitals.systolicBP),
        diastolicBP: String(vitals.diastolicBP),
        cholesterol: String(vitals.cholesterol),
        hdl: String(vitals.hdl),
        ldl: String(vitals.ldl),
        bmi: String(vitals.bmi),
        isSmoker: String(vitals.isSmoker),
        isDiabetic: String(vitals.isDiabetic),
        hasFamilyHistory: String(vitals.hasFamilyHistory),
        salt: salt.toString(),
      };
      await expect(groth16.fullProve(input, WASM_PATH, ZKEY_PATH)).to.be.rejected;
    });
  });
});

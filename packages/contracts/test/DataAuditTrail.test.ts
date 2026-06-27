import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

function contentHash(
  tokenId: bigint,
  patient: string,
  accessor: string,
  action: string,
  dataType: string,
  metadata: string,
  zk: string,
) {
  const abi = ethers.AbiCoder.defaultAbiCoder();
  return ethers.keccak256(
    abi.encode(
      ['uint256', 'address', 'address', 'string', 'string', 'string', 'bytes32'],
      [tokenId, patient, accessor, action, dataType, metadata, zk],
    ),
  );
}

async function auditFixture() {
  const [deployer, patient, service] = await ethers.getSigners();
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
  const zk = await (
    await ethers.getContractFactory('ZKProofVerifier')
  ).deploy(
    await identity.getAddress(),
    await audit.getAddress(),
    ethers.keccak256(ethers.toUtf8Bytes('vk')),
  );
  await zk.waitForDeployment();
  await consent.setAuditTrail(await audit.getAddress());
  await identity.connect(deployer).grantRole(await identity.MINTER_ROLE(), service.address);

  const defaultConsent = {
    allowResearch: true,
    allowInsuranceSharing: false,
    allowEmergencyAccess: true,
    dataRetentionDays: 365n,
  };
  await identity.connect(deployer).mintIdentity(patient.address, 'Qm', defaultConsent);

  return { audit, consent, identity, zk, deployer, patient, service };
}

describe('DataAuditTrail', function () {
  describe('Record event', function () {
    it('stores event and emits AuditEventRecorded', async function () {
      const { audit, consent, patient, service } = await loadFixture(auditFixture);
      const zk = ethers.ZeroHash;
      const h = contentHash(1n, patient.address, service.address, 'read', 'vitals', 'meta', zk);
      const tx = await consent
        .connect(service)
        .logAccess(1n, service.address, 'read', 'vitals', 'meta', zk);
      const receipt = await tx.wait();
      const ts = (await ethers.provider.getBlock(receipt!.blockNumber!))!.timestamp;
      await expect(tx).to.emit(audit, 'AuditEventRecorded').withArgs(1n, h, 'read', ts);
      expect(await audit.getEventCount()).to.equal(1n);
    });
  });

  describe('Deduplication', function () {
    it('reverts duplicate content hash', async function () {
      const { audit, consent, service } = await loadFixture(auditFixture);
      await consent.connect(service).logAccess(1n, service.address, 'read', 'vitals', 'same', ethers.ZeroHash);
      await expect(
        consent.connect(service).logAccess(1n, service.address, 'read', 'vitals', 'same', ethers.ZeroHash),
      ).to.be.revertedWithCustomError(audit, 'DuplicateRecord');
    });
  });

  describe('Verify event', function () {
    it('returns stored event and reverts unknown', async function () {
      const { audit, consent, patient, service } = await loadFixture(auditFixture);
      const zk = ethers.ZeroHash;
      const h = contentHash(1n, patient.address, service.address, 'read', 'cardiovascular_risk', 'm', zk);
      await consent.connect(service).logAccess(1n, service.address, 'read', 'cardiovascular_risk', 'm', zk);
      const ev = await audit.verifyEvent(h);
      expect(ev.action).to.equal('read');
      await expect(audit.verifyEvent(ethers.randomBytes(32))).to.be.revertedWithCustomError(audit, 'EventNotFound');
    });
  });

  describe('Patient filter', function () {
    it('returns only events for that patient', async function () {
      const { audit, consent, identity, patient, service, deployer } = await loadFixture(auditFixture);
      const signers = await ethers.getSigners();
      const p2 = signers[8];
      const dc = {
        allowResearch: true,
        allowInsuranceSharing: false,
        allowEmergencyAccess: true,
        dataRetentionDays: 365n,
      };
      await identity.connect(deployer).mintIdentity(p2.address, 'Qm2', dc);
      await consent.connect(service).logAccess(1n, service.address, 'read', 't', 'm1', ethers.ZeroHash);
      await consent.connect(service).logAccess(2n, service.address, 'read', 't', 'm2', ethers.ZeroHash);
      const evs = await audit.getEventsForPatient(patient.address);
      expect(evs.length).to.equal(1);
      expect(evs[0].indexedTokenId).to.equal(1n);
    });
  });

  describe('Pagination', function () {
    it('returns correct slice', async function () {
      const { audit, consent, patient, service } = await loadFixture(auditFixture);
      for (let i = 0; i < 3; i++) {
        await consent.connect(service).logAccess(1n, service.address, 'read', 't', `m${i}`, ethers.randomBytes(32));
      }
      expect(await audit.getEventCount()).to.equal(3n);
      const slice = await audit.getEventsInRange(0n, 1n);
      expect(slice.length).to.equal(2);
    });

    it('reverts on invalid range', async function () {
      const { audit, consent, service } = await loadFixture(auditFixture);
      await consent.connect(service).logAccess(1n, service.address, 'read', 't', 'a', ethers.ZeroHash);
      await expect(audit.getEventsInRange(1n, 0n)).to.be.revertedWithCustomError(audit, 'InvalidRange');
    });
  });

  describe('Count', function () {
    it('getEventCount matches pushes', async function () {
      const { audit, consent, service } = await loadFixture(auditFixture);
      expect(await audit.getEventCount()).to.equal(0n);
      await consent.connect(service).logAccess(1n, service.address, 'read', 't', 'a', ethers.ZeroHash);
      expect(await audit.getEventCount()).to.equal(1n);
    });
  });

  describe('Authorization', function () {
    it('reverts record from random address', async function () {
      const { audit, patient, deployer } = await loadFixture(auditFixture);
      await expect(
        audit.connect(deployer).recordEvent(1n, patient.address, deployer.address, 'x', 'y', 'z', ethers.ZeroHash),
      ).to.be.revertedWithCustomError(audit, 'NotAuthorizedRecorder');
    });
  });
});

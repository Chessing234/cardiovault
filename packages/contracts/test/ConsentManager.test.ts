import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

const defaultConsent = {
  allowResearch: true,
  allowInsuranceSharing: false,
  allowEmergencyAccess: true,
  dataRetentionDays: 365n,
};

async function fullFixture() {
  const [deployer, patient, accessor, service, rando] = await ethers.getSigners();
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

  const consent = await (await ethers.getContractFactory('ConsentManager')).deploy(
    await identity.getAddress(),
  );
  await consent.waitForDeployment();
  expect(await consent.getAddress()).to.equal(predictedConsent);

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
    ethers.keccak256(ethers.toUtf8Bytes('mock-vk')),
  );
  await zk.waitForDeployment();
  expect(await zk.getAddress()).to.equal(predictedZk);

  await consent.setAuditTrail(await audit.getAddress());

  await identity.connect(deployer).grantRole(await identity.MINTER_ROLE(), service.address);
  await identity.connect(deployer).mintIdentity(patient.address, 'QmPatient', defaultConsent);

  return { identity, consent, audit, zk, deployer, patient, accessor, service, rando };
}

describe('ConsentManager', function () {
  describe('Deployment', function () {
    it('links to correct identity contract', async function () {
      const { identity, consent } = await loadFixture(fullFixture);
      expect(await consent.identityContract()).to.equal(await identity.getAddress());
    });
  });

  describe('Grant permission', function () {
    it('patient grants accessor and permission stored with expiry', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      const expiry = BigInt(await time.latest()) + 10000n;
      const cats = ['vitals', 'cardiovascular'];
      await expect(consent.connect(patient).grantPermission(1n, accessor.address, expiry, 'claim', cats))
        .to.emit(consent, 'PermissionGranted')
        .withArgs(1n, accessor.address, expiry);

      const p = await consent.connect(patient).getPermissionDetails(1n, accessor.address);
      expect(p.isGranted).to.be.true;
      expect(p.expiryTimestamp).to.equal(expiry);
      expect(p.purpose).to.equal('claim');
      expect(p.allowedDataCategories).to.deep.equal(cats);
    });

    it('reverts grant to zero address', async function () {
      const { consent, patient } = await loadFixture(fullFixture);
      await expect(
        consent.connect(patient).grantPermission(1n, ethers.ZeroAddress, 0n, 'x', ['vitals']),
      ).to.be.revertedWithCustomError(consent, 'InvalidAccessor');
    });

    it('reverts grant from non-owner', async function () {
      const { consent, accessor, rando } = await loadFixture(fullFixture);
      await expect(
        consent.connect(rando).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']),
      ).to.be.revertedWithCustomError(consent, 'NotTokenOwner');
    });
  });

  describe('Revoke permission', function () {
    it('patient revokes accessor', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      await expect(consent.connect(patient).revokePermission(1n, accessor.address)).to.emit(
        consent,
        'PermissionRevoked',
      );
      const p = await consent.connect(patient).getPermissionDetails(1n, accessor.address);
      expect(p.isGranted).to.be.false;
    });

    it('accessor can self-revoke', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      await expect(consent.connect(accessor).revokePermission(1n, accessor.address)).to.emit(
        consent,
        'PermissionRevoked',
      );
    });
  });

  describe('Check permission', function () {
    it('returns true when valid', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      expect(await consent.checkPermission(1n, accessor.address, 'vitals')).to.be.true;
    });

    it('returns false after expiry', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      const now = BigInt(await time.latest());
      const expiry = now + 100n;
      await consent.connect(patient).grantPermission(1n, accessor.address, expiry, 'p', ['vitals']);
      await time.increaseTo(expiry + 1n);
      expect(await consent.checkPermission(1n, accessor.address, 'vitals')).to.be.false;
    });

    it('returns false after revoke', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      await consent.connect(patient).revokePermission(1n, accessor.address);
      expect(await consent.checkPermission(1n, accessor.address, 'vitals')).to.be.false;
    });

    it('returns false for category not in grant list', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      expect(await consent.checkPermission(1n, accessor.address, 'medications')).to.be.false;
    });
  });

  describe('Access logging', function () {
    it('records logs and emits DataAccessed', async function () {
      const { consent, patient, service } = await loadFixture(fullFixture);
      const tx = await consent
        .connect(service)
        .logAccess(1n, service.address, 'read', 'vitals', 'audit', ethers.ZeroHash);
      const receipt = await tx.wait();
      const ts = (await ethers.provider.getBlock(receipt!.blockNumber!))!.timestamp;
      await expect(tx).to.emit(consent, 'DataAccessed').withArgs(1n, service.address, 'read', ts);
      const logs = await consent.connect(patient).getAccessLogs(1n);
      expect(logs.length).to.equal(1);
      expect(logs[0].action).to.equal('read');
    });

    it('reverts logAccess from non-minter', async function () {
      const { consent, patient, rando } = await loadFixture(fullFixture);
      await expect(
        consent.connect(rando).logAccess(1n, rando.address, 'read', 'vitals', 'x', ethers.ZeroHash),
      ).to.be.revertedWithCustomError(consent, 'NotAuthorizedService');
    });

    it('writes to DataAuditTrail when wired', async function () {
      const { consent, audit, patient, service } = await loadFixture(fullFixture);
      await consent.connect(service).logAccess(1n, service.address, 'read', 'vitals', 'hipaa', ethers.ZeroHash);
      expect(await audit.getEventCount()).to.equal(1n);
      const ev = await audit.verifyEvent(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint256', 'address', 'address', 'string', 'string', 'string', 'bytes32'],
            [1n, patient.address, service.address, 'read', 'vitals', 'hipaa', ethers.ZeroHash],
          ),
        ),
      );
      expect(ev.patient).to.equal(patient.address);
    });
  });

  describe('Query restrictions', function () {
    it('only patient can getAccessLogs', async function () {
      const { consent, patient, service, rando } = await loadFixture(fullFixture);
      await consent.connect(service).logAccess(1n, service.address, 'read', 'vitals', 'p', ethers.ZeroHash);
      await expect(consent.connect(rando).getAccessLogs(1n)).to.be.revertedWithCustomError(consent, 'NotTokenOwner');
      await consent.connect(patient).getAccessLogs(1n);
    });

    it('patient and accessor can read permission details', async function () {
      const { consent, patient, accessor } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      await consent.connect(patient).getPermissionDetails(1n, accessor.address);
      await consent.connect(accessor).getPermissionDetails(1n, accessor.address);
    });

    it('stranger cannot read permission details', async function () {
      const { consent, patient, accessor, rando } = await loadFixture(fullFixture);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
      await expect(consent.connect(rando).getPermissionDetails(1n, accessor.address)).to.be.revertedWithCustomError(
        consent,
        'NotPatientOrAccessor',
      );
    });
  });

  describe('Inactive identity', function () {
    it('reverts grant when identity deactivated', async function () {
      const { identity, consent, patient, accessor, deployer } = await loadFixture(fullFixture);
      await identity.connect(patient).deactivateIdentity(1n);
      await expect(
        consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']),
      ).to.be.revertedWithCustomError(consent, 'InactiveIdentity');
      await identity.connect(deployer).reactivateIdentity(1n);
      await consent.connect(patient).grantPermission(1n, accessor.address, 0n, 'p', ['vitals']);
    });
  });
});

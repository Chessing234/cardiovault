import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

const defaultConsent = {
  allowResearch: true,
  allowInsuranceSharing: false,
  allowEmergencyAccess: true,
  dataRetentionDays: 365n,
};

describe('CardioVault integration (contracts)', function () {
  async function deployAll() {
    const [deployer, patient1, patient2, doctor, service] = await ethers.getSigners();

    const identity = await (await ethers.getContractFactory('HealthIdentitySBT')).deploy();
    await identity.waitForDeployment();

    const consent = await (await ethers.getContractFactory('ConsentManager')).deploy(
      await identity.getAddress()
    );
    await consent.waitForDeployment();

    const zkPlaceholder = deployer.address;
    const audit = await (await ethers.getContractFactory('DataAuditTrail')).deploy(
      await consent.getAddress(),
      zkPlaceholder
    );
    await audit.waitForDeployment();

    await consent.connect(deployer).setAuditTrail(await audit.getAddress());
    await identity.connect(deployer).grantRole(await identity.MINTER_ROLE(), service.address);
    await identity.connect(deployer).mintIdentity(patient1.address, 'encrypted-cid-123', defaultConsent);

    return { identity, consent, audit, deployer, patient1, patient2, doctor, service };
  }

  it('mint → grant consent → service log → patient reads audit trail', async function () {
    const { identity, consent, patient1, doctor, service } = await loadFixture(deployAll);

    const tokenId = await identity.patientToTokenId(patient1.address);
    expect(tokenId).to.equal(1n);

    const expiry = BigInt(await time.latest()) + 86400n;
    await consent
      .connect(patient1)
      .grantPermission(tokenId, doctor.address, expiry, 'Annual checkup', ['vitals', 'cardiovascular']);

    expect(await consent.checkPermission(tokenId, doctor.address, 'vitals')).to.equal(true);

    await consent
      .connect(service)
      .logAccess(tokenId, doctor.address, 'read', 'vitals', 'Annual checkup', ethers.ZeroHash);

    const logs = await consent.connect(patient1).getAccessLogs(tokenId);
    expect(logs.length).to.equal(1);
    expect(logs[0].accessor).to.equal(doctor.address);
  });

  it('blocks unauthorized accessors', async function () {
    const { identity, consent, patient1, patient2 } = await loadFixture(deployAll);
    const tokenId = await identity.patientToTokenId(patient1.address);
    expect(await consent.checkPermission(tokenId, patient2.address, 'vitals')).to.equal(false);
  });

  it('expires permissions after the deadline', async function () {
    const { identity, consent, patient1, doctor } = await loadFixture(deployAll);
    const tokenId = await identity.patientToTokenId(patient1.address);
    const soon = BigInt(await time.latest()) + 2n;

    await consent.connect(patient1).grantPermission(tokenId, doctor.address, soon, 'Test', ['vitals']);

    expect(await consent.checkPermission(tokenId, doctor.address, 'vitals')).to.equal(true);

    await time.increase(5);

    expect(await consent.checkPermission(tokenId, doctor.address, 'vitals')).to.equal(false);
  });
});

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

const defaultConsent = {
  allowResearch: true,
  allowInsuranceSharing: false,
  allowEmergencyAccess: true,
  dataRetentionDays: 365n,
};

async function deployIdentityFixture() {
  const [deployer, patient, other, minter] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory('HealthIdentitySBT');
  const identity = await Factory.deploy();
  await identity.waitForDeployment();
  await identity.connect(deployer).grantRole(await identity.MINTER_ROLE(), minter.address);
  return { identity, deployer, patient, other, minter };
}

describe('HealthIdentitySBT', function () {
  describe('Deployment', function () {
    it('sets correct name and symbol', async function () {
      const { identity } = await loadFixture(deployIdentityFixture);
      expect(await identity.name()).to.equal('CardioVault Identity');
      expect(await identity.symbol()).to.equal('CVID');
    });

    it('grants DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer', async function () {
      const { identity, deployer } = await loadFixture(deployIdentityFixture);
      expect(await identity.hasRole(await identity.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await identity.hasRole(await identity.MINTER_ROLE(), deployer.address)).to.be.true;
    });

    it('defines VERIFIER_ROLE constant', async function () {
      const { identity } = await loadFixture(deployIdentityFixture);
      expect(await identity.VERIFIER_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes('VERIFIER_ROLE')));
    });
  });

  describe('Minting', function () {
    it('minter can mint and patient receives token', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      const cid = 'QmTest';
      const tx = await identity.connect(minter).mintIdentity(patient.address, cid, defaultConsent);
      const receipt = await tx.wait();
      const ts = (await ethers.provider.getBlock(receipt!.blockNumber!))!.timestamp;
      await expect(tx).to.emit(identity, 'IdentityMinted').withArgs(patient.address, 1n, ts);

      expect(await identity.ownerOf(1n)).to.equal(patient.address);
      expect(await identity.hasHealthIdentity(patient.address)).to.be.true;
      expect(await identity.getPatientTokenId(patient.address)).to.equal(1n);
    });

    it('reverts duplicate mint for same patient', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'a', defaultConsent);
      await expect(
        identity.connect(minter).mintIdentity(patient.address, 'b', defaultConsent),
      ).to.be.revertedWithCustomError(identity, 'AlreadyHasIdentity');
    });

    it('reverts when non-minter mints', async function () {
      const { identity, patient, other } = await loadFixture(deployIdentityFixture);
      await expect(
        identity.connect(other).mintIdentity(patient.address, 'x', defaultConsent),
      ).to.be.reverted;
    });

    it('patient can self-register via registerIdentity', async function () {
      const { identity, patient } = await loadFixture(deployIdentityFixture);
      const tx = await identity.connect(patient).registerIdentity('QmSelf', defaultConsent);
      await expect(tx).to.emit(identity, 'IdentityMinted');

      expect(await identity.hasHealthIdentity(patient.address)).to.be.true;
      expect(await identity.ownerOf(1n)).to.equal(patient.address);
    });

    it('reverts mint to zero address', async function () {
      const { identity, minter } = await loadFixture(deployIdentityFixture);
      await expect(
        identity.connect(minter).mintIdentity(ethers.ZeroAddress, 'x', defaultConsent),
      ).to.be.revertedWithCustomError(identity, 'InvalidPatient');
    });
  });

  describe('Soulbound property', function () {
    it('transferFrom reverts', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await expect(
        identity.connect(patient).transferFrom(patient.address, other.address, 1n),
      ).to.be.revertedWithCustomError(identity, 'SoulboundNonTransferable');
    });

    it('approve reverts', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await expect(identity.connect(patient).approve(other.address, 1n)).to.be.revertedWithCustomError(
        identity,
        'SoulboundNonTransferable',
      );
    });

    it('setApprovalForAll reverts', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await expect(identity.connect(patient).setApprovalForAll(other.address, true)).to.be.revertedWithCustomError(
        identity,
        'SoulboundNonTransferable',
      );
    });
  });

  describe('Profile updates', function () {
    it('patient can update profile', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'old', defaultConsent);
      const tx = await identity.connect(patient).updateProfile(1n, 'newcid');
      const receipt = await tx.wait();
      const ts = (await ethers.provider.getBlock(receipt!.blockNumber!))!.timestamp;
      await expect(tx).to.emit(identity, 'ProfileUpdated').withArgs(1n, 'newcid', ts);
      const p = await identity.getProfile(1n);
      expect(p.encryptedCid).to.equal('newcid');
    });

    it('minter can update profile', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'old', defaultConsent);
      await identity.connect(minter).updateProfile(1n, 'fromminter');
      expect((await identity.getProfile(1n)).encryptedCid).to.equal('fromminter');
    });

    it('non-owner non-minter cannot update', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'old', defaultConsent);
      await expect(identity.connect(other).updateProfile(1n, 'hack')).to.be.revertedWithCustomError(
        identity,
        'NotPatientOrMinter',
      );
    });
  });

  describe('Consent updates', function () {
    it('patient can update consent and preferences stored', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      const next = {
        allowResearch: false,
        allowInsuranceSharing: true,
        allowEmergencyAccess: true,
        dataRetentionDays: 180n,
      };
      await expect(identity.connect(patient).updateConsent(1n, next)).to.emit(identity, 'ConsentUpdated');
      const p = await identity.getProfile(1n);
      expect(p.defaultConsent.allowResearch).to.be.false;
      expect(p.defaultConsent.allowInsuranceSharing).to.be.true;
      expect(p.defaultConsent.dataRetentionDays).to.equal(180n);
    });

    it('non-patient cannot update consent', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await expect(identity.connect(other).updateConsent(1n, defaultConsent)).to.be.revertedWithCustomError(
        identity,
        'NotPatient',
      );
    });
  });

  describe('Deactivation', function () {
    it('patient can deactivate', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await expect(identity.connect(patient).deactivateIdentity(1n)).to.emit(identity, 'IdentityDeactivated');
      expect(await identity.isIdentityActive(1n)).to.be.false;
    });

    it('admin can reactivate', async function () {
      const { identity, patient, deployer, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await identity.connect(patient).deactivateIdentity(1n);
      await identity.connect(deployer).reactivateIdentity(1n);
      expect(await identity.isIdentityActive(1n)).to.be.true;
    });

    it('non-admin cannot reactivate', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await identity.connect(patient).deactivateIdentity(1n);
      await expect(identity.connect(other).reactivateIdentity(1n)).to.be.reverted;
    });

    it('token still exists after deactivation', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      await identity.connect(patient).deactivateIdentity(1n);
      expect(await identity.ownerOf(1n)).to.equal(patient.address);
    });
  });

  describe('Queries', function () {
    it('getProfile returns expected data', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, 'cid1', defaultConsent);
      const p = await identity.getProfile(1n);
      expect(p.patient).to.equal(patient.address);
      expect(p.encryptedCid).to.equal('cid1');
      expect(p.isActive).to.be.true;
    });

    it('getPatientTokenId and hasHealthIdentity', async function () {
      const { identity, patient, other, minter } = await loadFixture(deployIdentityFixture);
      expect(await identity.hasHealthIdentity(patient.address)).to.be.false;
      await identity.connect(minter).mintIdentity(patient.address, 'c', defaultConsent);
      expect(await identity.hasHealthIdentity(patient.address)).to.be.true;
      expect(await identity.hasIdentity(patient.address)).to.be.true;
      expect(await identity.getPatientTokenId(patient.address)).to.equal(1n);
      expect(await identity.hasHealthIdentity(other.address)).to.be.false;
    });
  });

  describe('Edge cases', function () {
    it('allows empty encrypted CID', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(minter).mintIdentity(patient.address, '', defaultConsent);
      expect((await identity.getProfile(1n)).encryptedCid).to.equal('');
    });

    it('allows very long CID string', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      const longCid = 'x'.repeat(4000);
      await identity.connect(minter).mintIdentity(patient.address, longCid, defaultConsent);
      expect((await identity.getProfile(1n)).encryptedCid).to.equal(longCid);
    });
  });

  describe('Gas', function () {
    it('mint gas stays within practical bound (~332k on Hardhat; L2 often <300k)', async function () {
      const { identity, patient, minter } = await loadFixture(deployIdentityFixture);
      const tx = await identity.connect(minter).mintIdentity(patient.address, 'cid', defaultConsent);
      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.lessThan(340_000n);
    });
  });

  describe('Pausable', function () {
    it('blocks mint while paused', async function () {
      const { identity, patient, deployer, minter } = await loadFixture(deployIdentityFixture);
      await identity.connect(deployer).pause();
      await expect(
        identity.connect(minter).mintIdentity(patient.address, 'c', defaultConsent),
      ).to.be.revertedWithCustomError(identity, 'EnforcedPause');
    });
  });
});

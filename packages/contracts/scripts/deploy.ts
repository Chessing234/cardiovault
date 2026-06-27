import fs from 'fs';
import path from 'path';
import { ethers, network } from 'hardhat';

function loadZkHashFromArtifacts(): string {
  const vkPath = path.join(__dirname, '../circuits/build/verification_key.json');
  if (fs.existsSync(vkPath)) {
    return ethers.keccak256(ethers.toUtf8Bytes(fs.readFileSync(vkPath, 'utf8')));
  }
  return ethers.keccak256(ethers.toUtf8Bytes('cardiovault-mock-vk'));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const startNonce = await ethers.provider.getTransactionCount(deployer.address);

  const predictedConsent = ethers.getCreateAddress({
    from: deployer.address,
    nonce: BigInt(startNonce + 1),
  });
  const predictedZk = ethers.getCreateAddress({
    from: deployer.address,
    nonce: BigInt(startNonce + 3),
  });

  const HealthIdentitySBT = await ethers.getContractFactory('HealthIdentitySBT');
  const identity = await HealthIdentitySBT.deploy();
  await identity.waitForDeployment();
  const identityAddr = await identity.getAddress();

  const ConsentManager = await ethers.getContractFactory('ConsentManager');
  const consent = await ConsentManager.deploy(identityAddr);
  await consent.waitForDeployment();
  const consentAddr = await consent.getAddress();

  const DataAuditTrail = await ethers.getContractFactory('DataAuditTrail');
  const audit = await DataAuditTrail.deploy(consentAddr, predictedZk);
  await audit.waitForDeployment();
  const auditAddr = await audit.getAddress();

  const zkKey = loadZkHashFromArtifacts();
  const ZKProofVerifier = await ethers.getContractFactory('ZKProofVerifier');
  const zk = await ZKProofVerifier.deploy(identityAddr, auditAddr, zkKey);
  await zk.waitForDeployment();
  const zkAddr = await zk.getAddress();

  if (zkAddr.toLowerCase() !== predictedZk.toLowerCase()) {
    throw new Error(`ZK address prediction mismatch: ${zkAddr} vs ${predictedZk}`);
  }
  if (consentAddr.toLowerCase() !== predictedConsent.toLowerCase()) {
    throw new Error(`Consent address prediction mismatch: ${consentAddr} vs ${predictedConsent}`);
  }

  await consent.setAuditTrail(auditAddr);

  const deployed = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    HealthIdentitySBT: identityAddr,
    ConsentManager: consentAddr,
    DataAuditTrail: auditAddr,
    ZKProofVerifier: zkAddr,
    mockVerificationKey: zkKey,
  };

  const outPath = path.join(__dirname, '..', 'deployed.json');
  fs.writeFileSync(outPath, JSON.stringify(deployed, null, 2));

  console.log('CardioVault deployment complete:');
  console.log(JSON.stringify(deployed, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

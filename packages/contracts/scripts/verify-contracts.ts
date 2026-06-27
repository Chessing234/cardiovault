import fs from 'fs';
import path from 'path';
import { run } from 'hardhat';

async function main() {
  const deployedPath = path.join(__dirname, '..', 'deployed.json');
  if (!fs.existsSync(deployedPath)) {
    throw new Error(`Missing ${deployedPath}. Run deploy script first.`);
  }
  const d = JSON.parse(fs.readFileSync(deployedPath, 'utf8')) as {
    HealthIdentitySBT: string;
    ConsentManager: string;
    DataAuditTrail: string;
    ZKProofVerifier: string;
    mockVerificationKey: string;
  };

  console.log('Verifying HealthIdentitySBT...');
  await run('verify:verify', {
    address: d.HealthIdentitySBT,
    constructorArguments: [],
  });

  console.log('Verifying ConsentManager...');
  await run('verify:verify', {
    address: d.ConsentManager,
    constructorArguments: [d.HealthIdentitySBT],
  });

  console.log('Verifying DataAuditTrail...');
  await run('verify:verify', {
    address: d.DataAuditTrail,
    constructorArguments: [d.ConsentManager, d.ZKProofVerifier],
  });

  console.log('Verifying ZKProofVerifier...');
  await run('verify:verify', {
    address: d.ZKProofVerifier,
    constructorArguments: [d.HealthIdentitySBT, d.DataAuditTrail, d.mockVerificationKey],
  });

  console.log('All contracts submitted for verification.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

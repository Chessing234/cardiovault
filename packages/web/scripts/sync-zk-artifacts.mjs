import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, '..', 'contracts', 'circuits', 'build');
const dest = path.join(root, 'public', 'zk');

const files = [
  ['HealthProof_js/HealthProof.wasm', 'HealthProof.wasm'],
  ['HealthProof_final.zkey', 'HealthProof_final.zkey'],
];

if (!fs.existsSync(src)) {
  console.warn('[sync-zk-artifacts] Skip — run `npm run zk:setup -w contracts` first.');
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });

for (const [from, to] of files) {
  const srcPath = path.join(src, from);
  const destPath = path.join(dest, to);
  if (!fs.existsSync(srcPath)) {
    console.warn(`[sync-zk-artifacts] Missing ${srcPath}`);
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`[sync-zk-artifacts] ${to}`);
}

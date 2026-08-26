import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('config/aura-release-contract.json', 'utf8'));
const specs = [...contract.blockingE2E.lifecycle, ...contract.blockingE2E.authSecurity];
const extraArgs = process.argv.slice(2);

if (contract.schema !== 'aura.release-contract.v1' || specs.length === 0) {
  console.error('Invalid or empty AURA release contract.');
  process.exit(1);
}

const result = spawnSync(
  'bunx',
  ['playwright', 'test', ...specs, ...extraArgs],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);

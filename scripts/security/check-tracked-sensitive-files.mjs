import { execFileSync } from 'node:child_process';
import path from 'node:path';

const allowedEnvironmentTemplates = new Set([
  '.env.example',
  '.env.test.example',
]);

const blockedPrivateKeyBasenames = new Set([
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
]);

const blockedPrivateKeyExtensions = new Set([
  '.pem',
  '.key',
  '.p12',
  '.pfx',
  '.jks',
]);

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return output.split('\0').filter(Boolean);
}

function isBlockedEnvironmentFile(file) {
  const basename = path.posix.basename(file);
  if (allowedEnvironmentTemplates.has(basename)) return false;
  return basename === '.env' || basename.startsWith('.env.');
}

function isBlockedPrivateKeyFile(file) {
  const basename = path.posix.basename(file);
  if (blockedPrivateKeyBasenames.has(basename)) return true;
  return blockedPrivateKeyExtensions.has(path.posix.extname(basename).toLowerCase());
}

const blocked = trackedFiles().filter(
  (file) => isBlockedEnvironmentFile(file) || isBlockedPrivateKeyFile(file),
);

if (blocked.length > 0) {
  console.error('Repository hygiene check failed: sensitive deployment/private-key files are tracked.');
  for (const file of blocked.sort()) console.error(` - ${file}`);
  console.error('Keep only sanitized templates such as .env.example and inject real values at runtime.');
  process.exit(1);
}

console.log('Repository hygiene check passed: no blocked environment or private-key files are tracked.');

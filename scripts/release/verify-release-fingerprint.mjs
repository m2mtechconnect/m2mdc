import fs from 'node:fs';

const args = process.argv.slice(2);
const options = new Map();
for (let i = 0; i < args.length; i += 1) {
  const key = args[i];
  if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
  options.set(key.slice(2), value);
  i += 1;
}

function required(name) {
  const value = options.get(name)?.trim();
  if (!value) throw new Error(`Missing required --${name}`);
  return value;
}

const file = required('file');
const expectedSha = required('expected-sha');
const expectedEnvironment = required('expected-environment');
const expectedBranch = options.get('expected-branch')?.trim() || null;
const githubOutput = options.get('github-output')?.trim() || null;
const outputPrefix = options.get('output-prefix')?.trim() || '';

if (!/^[0-9a-f]{40}$/i.test(expectedSha)) {
  throw new Error('Expected SHA must be a full 40-character Git SHA');
}
if (!['staging', 'production', 'ci'].includes(expectedEnvironment)) {
  throw new Error(`Unsupported expected environment: ${expectedEnvironment}`);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  throw new Error(`Release fingerprint could not be parsed: ${error instanceof Error ? error.message : 'unknown error'}`);
}

if (payload.schema !== 'aura.release-fingerprint.v1') {
  throw new Error(`Unexpected release fingerprint schema: ${payload.schema}`);
}
if (payload.sha !== expectedSha) {
  throw new Error(`Release fingerprint SHA ${String(payload.sha)} does not match expected ${expectedSha}`);
}
if (payload.environment !== expectedEnvironment) {
  throw new Error(
    `Release fingerprint environment ${String(payload.environment)} does not match expected ${expectedEnvironment}`,
  );
}

const branch = typeof payload.branch === 'string' ? payload.branch.trim() : '';
if (!branch || ['unknown', 'HEAD', '__orphan__'].includes(branch)) {
  throw new Error(`Release fingerprint branch is not authoritative: ${branch || 'missing'}`);
}
if (expectedBranch && branch !== expectedBranch) {
  throw new Error(`Release fingerprint branch ${branch} does not match expected ${expectedBranch}`);
}

const buildId = typeof payload.buildId === 'string' ? payload.buildId.trim() : '';
if (!buildId || buildId === 'unknown') {
  throw new Error('Release fingerprint buildId is missing or unknown');
}

const builtAt = typeof payload.builtAt === 'string' ? payload.builtAt.trim() : '';
const builtAtMs = Date.parse(builtAt);
if (!builtAt || !Number.isFinite(builtAtMs)) {
  throw new Error('Release fingerprint builtAt is missing or invalid');
}

const version = typeof payload.version === 'string' ? payload.version.trim() : '';
if (!version) {
  throw new Error('Release fingerprint version is missing');
}

const normalized = {
  sha: payload.sha,
  branch,
  environment: payload.environment,
  buildId,
  builtAt,
  version,
};

if (githubOutput) {
  const lines = [
    `${outputPrefix}sha=${normalized.sha}`,
    `${outputPrefix}branch=${normalized.branch}`,
    `${outputPrefix}environment=${normalized.environment}`,
    `${outputPrefix}build_id=${normalized.buildId}`,
    `${outputPrefix}built_at=${normalized.builtAt}`,
    `${outputPrefix}version=${normalized.version}`,
  ];
  fs.appendFileSync(githubOutput, `${lines.join('\n')}\n`);
}

console.log(JSON.stringify(normalized, null, 2));

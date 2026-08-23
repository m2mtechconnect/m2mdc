import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MANIFEST_PATH = path.resolve('config/edge-function-manifest.json');
const FUNCTIONS_ROOT = path.resolve('supabase/functions');
const EXPECTED_SCHEMA = 'aura.edge-function-manifest.v1';

function fail(message) {
  console.error(`EDGE_FUNCTION_GOVERNANCE_FAILED: ${message}`);
  process.exitCode = 1;
}

function resolveBaseRef() {
  const configured = process.env.GOVERNANCE_BASE_SHA?.trim();
  if (configured && !/^0+$/.test(configured)) return configured;
  try {
    execFileSync('git', ['rev-parse', 'HEAD^'], { stdio: 'ignore' });
    return 'HEAD^';
  } catch {
    return null;
  }
}

function changedFiles() {
  const base = resolveBaseRef();
  if (!base) return [];
  const output = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`, '--'], {
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  throw new Error(`Edge Function manifest is missing: ${MANIFEST_PATH}`);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
if (manifest.schema !== EXPECTED_SCHEMA) {
  throw new Error(`Unexpected Edge Function manifest schema: ${manifest.schema}`);
}
if (!manifest.functions || typeof manifest.functions !== 'object' || Array.isArray(manifest.functions)) {
  throw new Error('Edge Function manifest functions map is malformed');
}

const actualFunctions = new Set(
  fs.readdirSync(FUNCTIONS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
    .map((entry) => entry.name),
);

const allowedStatuses = new Set(['active', 'deprecated', 'disabled']);
for (const [name, entry] of Object.entries(manifest.functions)) {
  if (!actualFunctions.has(name)) {
    fail(`manifest entry ${name} does not correspond to an Edge Function directory`);
    continue;
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    fail(`manifest entry ${name} is malformed`);
    continue;
  }
  if (!allowedStatuses.has(entry.status)) fail(`${name}: invalid status`);
  for (const key of ['authClass', 'gatewayVerification', 'cors', 'tenantScope', 'owner']) {
    if (typeof entry[key] !== 'string' || !entry[key].trim()) {
      fail(`${name}: ${key} must be a non-empty string`);
    }
  }
  if (!entry.serviceRole || typeof entry.serviceRole.used !== 'boolean') {
    fail(`${name}: serviceRole.used must be boolean`);
  } else if (entry.serviceRole.used &&
    (typeof entry.serviceRole.reason !== 'string' || !entry.serviceRole.reason.trim())) {
    fail(`${name}: service-role use requires an explicit reason`);
  }
  if (entry.replacement !== null && typeof entry.replacement !== 'string') {
    fail(`${name}: replacement must be a string or null`);
  }
  if (entry.retirementDate !== null && typeof entry.retirementDate !== 'string') {
    fail(`${name}: retirementDate must be a string or null`);
  }
}

const changedFunctions = new Set();
for (const filename of changedFiles()) {
  const match = filename.match(/^supabase\/functions\/([^/]+)\//);
  if (match && match[1] !== '_shared') changedFunctions.add(match[1]);
}

for (const name of [...changedFunctions].sort()) {
  if (!manifest.functions[name]) {
    fail(
      `${name}: changed or newly added Edge Functions must be registered in config/edge-function-manifest.json`,
    );
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(
  `Edge Function governance passed: ${changedFunctions.size} changed function(s), ` +
  `${Object.keys(manifest.functions).length} classified manifest entries.`,
);

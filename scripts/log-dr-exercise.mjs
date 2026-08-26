#!/usr/bin/env node
/**
 * DR exercise evidence logger.
 *
 * Captures the outcome of a backup, restore or rollback exercise as an
 * immutable evidence record, and regenerates the supervisor registry so the
 * readiness surface reflects it.
 *
 * Fail-closed rules:
 *  - `--artifact <path>` is mandatory and must point at an existing file in
 *    this repository. Without a supplied test artifact nothing is written.
 *  - RTO/RPO are recorded only when measured values AND a measurement method
 *    are supplied. No targets, estimates or defaults are invented.
 *  - Only `--outcome completed` can upgrade readiness state downstream; other
 *    outcomes are still recorded, as evidence of an attempt.
 *  - No secret values, tenant data or credentials are read or written.
 *
 * Usage:
 *   node scripts/log-dr-exercise.mjs \
 *     --scope restore,rollback \
 *     --outcome completed \
 *     --artifact docs/evidence/dr-exercises/artifacts/2026-08-26-restore.log \
 *     --operator "Release Owner" \
 *     --performed-at 2026-08-26T14:00:00Z \
 *     [--rto 42:minutes:"restore log timestamps"] \
 *     [--rpo 5:minutes:"last WAL checkpoint delta"] \
 *     [--note "Full restore from managed backup into staging."]
 */
import fs from 'node:fs';
import path from 'node:path';

const SCOPES = ['backup', 'restore', 'rollback'];
const OUTCOMES = ['completed', 'partial', 'failed', 'aborted'];
const UNITS = ['seconds', 'minutes', 'hours'];

const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/evidence/dr-exercises');
const REGISTRY_FILE = path.resolve(process.cwd(), 'src/supervisor/drExerciseRegistry.ts');

function fail(message) {
  console.error(`BLOCKED: ${message}`);
  process.exit(1);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function parseMeasurement(raw, label) {
  if (!raw) return undefined;
  const [value, unit, ...rest] = raw.split(':');
  const method = rest.join(':').trim();
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) fail(`${label} value must be a measured non-negative number`);
  if (!UNITS.includes(unit)) fail(`${label} unit must be one of ${UNITS.join(', ')}`);
  if (!method) fail(`${label} requires a measurement method (value:unit:method)`);
  return { value: num, unit, method };
}

const artifact = arg('artifact');
if (!artifact) fail('--artifact is required. An exercise without a supplied test artifact is not evidence.');
const artifactAbs = path.resolve(process.cwd(), artifact);
if (!fs.existsSync(artifactAbs) || !fs.statSync(artifactAbs).isFile()) {
  fail(`artifact not found on disk: ${artifact}`);
}
const artifactRef = path.relative(process.cwd(), artifactAbs).split(path.sep).join('/');

const scopes = (arg('scope') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (scopes.length === 0) fail('--scope is required (backup, restore, rollback)');
for (const s of scopes) if (!SCOPES.includes(s)) fail(`unrecognised scope: ${s}`);

const outcome = arg('outcome');
if (!OUTCOMES.includes(outcome)) fail(`--outcome must be one of ${OUTCOMES.join(', ')}`);

const operator = (arg('operator') ?? '').trim();
if (!operator) fail('--operator is required for accountability');

const performedAt = (arg('performed-at') ?? new Date().toISOString()).trim();
if (Number.isNaN(Date.parse(performedAt))) fail('--performed-at must be an ISO-8601 timestamp');

const rto = parseMeasurement(arg('rto'), 'rto');
const rpo = parseMeasurement(arg('rpo'), 'rpo');

const stamp = new Date(performedAt).toISOString();
const id = `dr-${scopes.join('-')}-${stamp.replace(/[-:.]/g, '').slice(0, 15)}`;

const record = {
  id,
  performedAt: stamp,
  scopes,
  outcome,
  artifactRef,
  operator,
  ...(rto ? { rto } : {}),
  ...(rpo ? { rpo } : {}),
  note: (arg('note') ?? '').trim() || 'No additional operator note supplied.',
};

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const recordPath = path.join(EVIDENCE_DIR, `${id}.json`);
if (fs.existsSync(recordPath)) fail(`an exercise record already exists at ${recordPath}; records are immutable`);
fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

// Regenerate the registry from every recorded exercise on disk.
const records = fs
  .readdirSync(EVIDENCE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, f), 'utf8')));

const header = fs.readFileSync(REGISTRY_FILE, 'utf8').split('export const')[0];
fs.writeFileSync(
  REGISTRY_FILE,
  `${header}export const DR_EXERCISE_REGISTRY: readonly unknown[] = ${JSON.stringify(records, null, 2)};\n`,
);

console.log(`Recorded DR exercise ${id} (${outcome}) from artifact ${artifactRef}`);
console.log(`Evidence: ${path.relative(process.cwd(), recordPath)}`);
console.log(`Registry entries: ${records.length}`);
if (outcome !== 'completed') {
  console.log('Outcome is not `completed`: readiness state is unchanged. An attempt is not proof of recovery.');
}

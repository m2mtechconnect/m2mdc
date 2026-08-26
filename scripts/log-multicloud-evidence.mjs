#!/usr/bin/env node
/**
 * Multicloud portability evidence ingestion.
 *
 * Ingests infrastructure-as-code / deployment manifests and their validation
 * result as an immutable evidence record, then regenerates the supervisor
 * registry so the portability matrix reflects it.
 *
 * Fail-closed rules:
 *  - `--artifact <path>:<kind>` is repeatable and mandatory. Each path must
 *    exist as a file in this repository; its SHA-256 is recorded.
 *  - The supplied artifact classes must be able to prove the claimed stage.
 *    Templates cannot prove `tested` or `verified` - only plan output,
 *    deployment logs or test reports can.
 *  - Only `--validation-status passed` upgrades the matrix. `failed` and
 *    `not-run` are still recorded, as evidence of an attempt.
 *  - `verified` is withheld at render time until designed, configured and
 *    tested all carry artifacts, regardless of what is ingested here.
 *  - No credentials, endpoints, account identifiers or tenant data are read
 *    or written. Artifacts are hashed, never copied or transmitted.
 *
 * Usage:
 *   node scripts/log-multicloud-evidence.mjs \
 *     --target aws \
 *     --stage configured \
 *     --artifact infra/aws/main.tf:terraform \
 *     --artifact infra/aws/eks.tf:terraform \
 *     --validation-method "terraform validate" \
 *     --validation-status passed \
 *     --validator "Platform Engineering" \
 *     [--performed-at 2026-08-26T14:00:00Z] \
 *     [--note "Baseline EKS + networking module set."]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGETS = [
  'lovable-cloud-stack',
  'aws',
  'microsoft-azure',
  'google-cloud',
  'oci',
  'private-kubernetes',
];
const STAGES = ['designed', 'configured', 'tested', 'verified'];
const TEMPLATE_KINDS = [
  'terraform',
  'pulumi',
  'bicep',
  'arm-template',
  'cloudformation',
  'crossplane',
  'helm-chart',
  'kubernetes-manifest',
  'container-image-spec',
];
const EXECUTION_KINDS = ['plan-output', 'deployment-log', 'test-report'];
const KINDS = [...TEMPLATE_KINDS, ...EXECUTION_KINDS, 'architecture-document'];
const STAGE_REQUIREMENTS = {
  designed: ['architecture-document', ...TEMPLATE_KINDS],
  configured: TEMPLATE_KINDS,
  tested: EXECUTION_KINDS,
  verified: ['deployment-log', 'test-report'],
};
const STATUSES = ['passed', 'failed', 'not-run'];

const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/evidence/multicloud');
const REGISTRY_FILE = path.resolve(process.cwd(), 'src/supervisor/multicloudEvidenceRegistry.ts');

function fail(message) {
  console.error(`BLOCKED: ${message}`);
  process.exit(1);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function args(name) {
  const values = [];
  process.argv.forEach((value, i) => {
    if (value === `--${name}` && process.argv[i + 1]) values.push(process.argv[i + 1]);
  });
  return values;
}

const target = arg('target');
if (!TARGETS.includes(target)) fail(`--target must be one of ${TARGETS.join(', ')}`);

const stage = arg('stage');
if (!STAGES.includes(stage)) fail(`--stage must be one of ${STAGES.join(', ')}`);

const rawArtifacts = args('artifact');
if (rawArtifacts.length === 0) {
  fail('--artifact <path>:<kind> is required. A stage claim without artifacts is not evidence.');
}

const artifacts = rawArtifacts.map((raw) => {
  const sep = raw.lastIndexOf(':');
  if (sep === -1) fail(`artifact must be supplied as <path>:<kind> - got "${raw}"`);
  const filePath = raw.slice(0, sep);
  const kind = raw.slice(sep + 1);
  if (!KINDS.includes(kind)) fail(`unrecognised artifact kind "${kind}". Expected one of ${KINDS.join(', ')}`);
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) fail(`artifact not found on disk: ${filePath}`);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  return { path: path.relative(process.cwd(), abs).split(path.sep).join('/'), kind, sha256 };
});

const accepted = STAGE_REQUIREMENTS[stage];
if (!artifacts.some((a) => accepted.includes(a.kind))) {
  fail(`stage ${stage} requires at least one artifact of: ${accepted.join(', ')}`);
}

const method = (arg('validation-method') ?? '').trim();
if (!method) fail('--validation-method is required (how the artifacts were validated)');

const status = arg('validation-status');
if (!STATUSES.includes(status)) fail(`--validation-status must be one of ${STATUSES.join(', ')}`);

const validator = (arg('validator') ?? '').trim();
if (!validator) fail('--validator is required for accountability');

const performedAt = (arg('performed-at') ?? new Date().toISOString()).trim();
if (Number.isNaN(Date.parse(performedAt))) fail('--performed-at must be an ISO-8601 timestamp');

const stamp = new Date(performedAt).toISOString();
const id = `mc-${target}-${stage}-${stamp.replace(/[-:.]/g, '').slice(0, 15)}`;

const record = {
  id,
  targetId: target,
  stage,
  artifacts,
  validation: { method, status, performedAt: stamp, validator },
  note: (arg('note') ?? '').trim() || 'No additional operator note supplied.',
};

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const recordPath = path.join(EVIDENCE_DIR, `${id}.json`);
if (fs.existsSync(recordPath)) fail(`an evidence record already exists at ${recordPath}; records are immutable`);
fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

const records = fs
  .readdirSync(EVIDENCE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, f), 'utf8')));

const header = fs.readFileSync(REGISTRY_FILE, 'utf8').split('export const')[0];
fs.writeFileSync(
  REGISTRY_FILE,
  `${header}export const MULTICLOUD_EVIDENCE_REGISTRY: readonly unknown[] = ${JSON.stringify(records, null, 2)};\n`,
);

console.log(`Ingested ${target} / ${stage} evidence ${id} from ${artifacts.length} artifact(s)`);
for (const a of artifacts) console.log(`  ${a.kind}: ${a.path} (sha256 ${a.sha256.slice(0, 12)}...)`);
console.log(`Evidence: ${path.relative(process.cwd(), recordPath)}`);
console.log(`Registry entries: ${records.length}`);
if (status !== 'passed') {
  console.log('Validation did not pass: the portability matrix is unchanged. An attempt is not proof of portability.');
}
if (stage === 'verified') {
  console.log('Verified is only rendered once designed, configured and tested also carry artifacts.');
}

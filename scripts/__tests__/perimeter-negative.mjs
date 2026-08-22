#!/usr/bin/env node
/**
 * PR-0.1 Checkpoint B7.4B — consolidated negative-fixture harness for the
 * production-perimeter enforcer.
 *
 * Exercises all NINE required negative axes (NEG-A..NEG-J), one positive
 * control (NEG-H), and one clean control (real repo tree at HEAD).
 *
 * Every scratch case builds a self-contained dir under os.tmpdir() with
 * ONLY the skeleton the enforcer reads (evidence inventory + allowlist,
 * supabase/functions/<fn>/index.ts, supabase/config.toml, src/App.tsx),
 * mutates one axis, runs the real enforcer inside that dir, and asserts
 * the observed exit code + failure identity match the expected identity.
 *
 * No file outside the scratch dir is touched. Scratch dirs are removed
 * on success and preserved on failure for post-mortem.
 */
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const ENFORCER = resolve(REPO, 'scripts/verify-production-perimeter.mjs');

function writeFile(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function makeScratchRoot(caseId) {
  const root = join(tmpdir(), `perimeter-neg-${caseId}-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  return root;
}

function runEnforcer(root) {
  const r = spawnSync(process.execPath, [ENFORCER], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PERIMETER_CANARIES: '' },
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function baseSkeleton(root, { functions = [], allowlisted = [] } = {}) {
  // Minimal inventory covering every function dir we create.
  const inv = functions.map((name) => ({
    function: name,
    deployed: true,
    production_disposition: allowlisted.includes(name)
      ? 'production-allowlisted'
      : 'demo-only',
  }));
  writeFile(
    root,
    'docs/remediation/evidence/pr-0.1/edge-function-inventory.json',
    JSON.stringify(inv, null, 2),
  );
  writeFile(
    root,
    'docs/remediation/evidence/pr-0.1/route-allowlist.json',
    JSON.stringify(
      {
        schema_version: 2,
        policy: 'default-deny',
        production_functions: allowlisted,
        production_routes: ['/', '/login'],
        production_blocked_routes: [],
        development_only_routes: [],
        redirect_only_routes: [],
        forbidden_production_routes: ['/test/*', '/debug/*', '/dev/*', '/fixtures/*'],
        disabled_functions: [],
      },
      null,
      2,
    ),
  );
  writeFile(root, 'supabase/config.toml', '# scratch\n');
  writeFile(
    root,
    'src/App.tsx',
    `export default function App(){ return null; }\n`,
  );
  for (const name of functions) {
    writeFile(root, `supabase/functions/${name}/index.ts`, '// stub\n');
  }
  // Always ensure the functions directory exists (enforcer readdirs it).
  mkdirSync(join(root, 'supabase/functions'), { recursive: true });
}

function writeAllowlist(root, patch) {
  const p = join(root, 'docs/remediation/evidence/pr-0.1/route-allowlist.json');
  const cur = JSON.parse(readFileSync(p, 'utf8'));
  writeFile(root, 'docs/remediation/evidence/pr-0.1/route-allowlist.json',
    JSON.stringify({ ...cur, ...patch }, null, 2));
}

// ---- NEG-A: unclassified route in App.tsx ----
function runNegA() {
  const root = makeScratchRoot('A');
  baseSkeleton(root);
  writeFile(
    root,
    'src/App.tsx',
    `import { Route } from 'react-router-dom';\n` +
      `export default function App(){\n` +
      `  return <Route path="/rogue-uncategorized" element={null} />;\n` +
      `}\n`,
  );
  const r = runEnforcer(root);
  const expected = 'App.tsx declares unclassified route: /rogue-uncategorized';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-A', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-B: unclassified function (fn dir with no inventory entry) ----
function runNegB() {
  const root = makeScratchRoot('B');
  baseSkeleton(root, { functions: ['known-fn'] });
  // Write a second fn dir that is NOT in inventory.
  writeFile(root, 'supabase/functions/rogue-fn/index.ts', '// stub\n');
  const r = runEnforcer(root);
  const expected = 'function rogue-fn: missing from inventory';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-B', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-C: wildcard deploy in a workflow ----
function runNegC() {
  const root = makeScratchRoot('C');
  baseSkeleton(root);
  writeFile(
    root,
    '.github/workflows/deploy.yml',
    `name: deploy\njobs:\n  x:\n    steps:\n      - run: supabase functions deploy --all\n`,
  );
  const r = runEnforcer(root);
  const expected = 'deploy.yml: wildcard "supabase functions deploy" is forbidden';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-C', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-D: disabled function present in production_functions ----
function runNegD() {
  const root = makeScratchRoot('D');
  baseSkeleton(root, { functions: ['blocked-fn'], allowlisted: ['blocked-fn'] });
  // Also mark it disabled — must fail.
  writeAllowlist(root, { disabled_functions: ['blocked-fn'] });
  // Include a valid authz import so we isolate the NEG-D failure identity.
  writeFile(
    root,
    'supabase/functions/blocked-fn/index.ts',
    `import { requireApprovedUser } from '../_shared/authz.ts';\nexport default async () => new Response('ok');\n`,
  );
  const r = runEnforcer(root);
  const expected = 'allowlist: disabled function "blocked-fn" is also present in production_functions';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-D', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-E: allowlisted function missing _shared/authz import ----
function runNegE() {
  const root = makeScratchRoot('E');
  baseSkeleton(root, { functions: ['pilot-fn'], allowlisted: ['pilot-fn'] });
  // Deliberately write an index.ts with NO `_shared/authz` import.
  writeFile(
    root,
    'supabase/functions/pilot-fn/index.ts',
    `import { createClient } from 'npm:@supabase/supabase-js@2';\n` +
      `export default async function () { return new Response('ok'); }\n`,
  );
  const r = runEnforcer(root);
  const expected = 'allowlist/pilot-fn: missing "_shared/authz" import';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-E', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-F: forbidden browser env identifier in src/ ----
function runNegF() {
  const root = makeScratchRoot('F');
  baseSkeleton(root);
  writeFile(
    root,
    'src/leak.ts',
    `export const k = import.meta.env.VITE_LOVABLE_API_KEY;\n`,
  );
  const r = runEnforcer(root);
  const expected = 'references forbidden /VITE_LOVABLE_API_KEY/';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-F', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-G: unguarded forbidden dev/test route in App.tsx ----
function runNegG() {
  const root = makeScratchRoot('G');
  baseSkeleton(root);
  writeFile(
    root,
    'src/App.tsx',
    `import { Route } from 'react-router-dom';\n` +
      `export default function App(){\n` +
      `  return <Route path="/test/overlay-fixtures" element={null} />;\n` +
      `}\n`,
  );
  const r = runEnforcer(root);
  const expected = 'App.tsx declares forbidden production route: /test/*';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-G', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-H (control): same route but gated by import.meta.env.DEV ----
function runNegH() {
  const root = makeScratchRoot('H');
  baseSkeleton(root);
  writeFile(
    root,
    'src/App.tsx',
    `import { Route } from 'react-router-dom';\n` +
      `export default function App(){\n` +
      `  return import.meta.env.DEV ? <Route path="/test/overlay-fixtures" element={null} /> : null;\n` +
      `}\n`,
  );
  const r = runEnforcer(root);
  // Expected PASS: the DEV-gate suppresses the finding.
  const pass = r.code === 0;
  if (pass) rmSync(root, { recursive: true, force: true });
  return {
    id: 'NEG-H',
    pass,
    code: r.code,
    expected: 'exit=0 (DEV-gated route is exempt)',
    stderr: r.stderr.trim(),
  };
}

// ---- NEG-I: verify_jwt=false without signed-webhook disposition ----
function runNegI() {
  const root = makeScratchRoot('I');
  baseSkeleton(root, { functions: ['webhook-fn'] });
  // Inventory has webhook-fn as demo-only, not signed-webhook.
  writeFile(
    root,
    'supabase/config.toml',
    `[functions.webhook-fn]\nverify_jwt = false\n`,
  );
  const r = runEnforcer(root);
  const expected = 'config.toml: [webhook-fn] verify_jwt=false without signed-webhook disposition';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-I', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- NEG-J: arbitrary browser env key outside the public allowlist ----
function runNegJ() {
  const root = makeScratchRoot('J');
  baseSkeleton(root);
  writeFile(
    root,
    'src/leak.ts',
    `export const k = import.meta.env.VITE_UNAPPROVED_SECRET;\n`,
  );
  const r = runEnforcer(root);
  const expected = 'reads non-allowlisted import.meta.env.VITE_UNAPPROVED_SECRET';
  const pass = r.code === 1 && r.stderr.includes(expected);
  if (pass) rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-J', pass, code: r.code, expected, stderr: r.stderr.trim() };
}

// ---- CLEAN control: real repo tree at HEAD must pass ----
function runCleanControl() {
  const r = spawnSync(process.execPath, [resolve(REPO, 'scripts/verify-production-perimeter.mjs')], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, PERIMETER_CANARIES: '' },
  });
  const pass = r.status === 0;
  return {
    id: 'CLEAN',
    pass,
    code: r.status,
    expected: 'exit=0 (real repo tree passes at HEAD)',
    stderr: (r.stderr || '').trim(),
  };
}

const results = [
  runNegA(),
  runNegB(),
  runNegC(),
  runNegD(),
  runNegE(),
  runNegF(),
  runNegG(),
  runNegI(),
  runNegJ(),
  runNegH(),        // positive control
  runCleanControl() // clean control
];
let ok = true;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${r.id}  code=${r.code}  expected=${JSON.stringify(r.expected)}`);
  if (!r.pass) {
    ok = false;
    console.log(`  stderr: ${r.stderr}`);
  }
}
if (!ok) process.exit(1);
console.log(`\nAll ${results.length} negative fixtures behaved as expected.`);

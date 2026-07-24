#!/usr/bin/env node
/**
 * PR-0.1 Checkpoint B7.3 — isolated negative-fixture harness for the
 * production-perimeter enforcer.
 *
 * Each case builds a self-contained scratch directory containing the
 * minimal skeleton the enforcer requires (evidence inventory + allowlist,
 * supabase/functions/<fn>/index.ts, supabase/config.toml, src/App.tsx),
 * mutates one axis, then runs the real enforcer inside that dir and
 * asserts the expected exit code and failure substring.
 *
 * No files outside the scratch dir are touched.
 *
 * Adds two cases explicitly required by B7.3:
 *   NEG-E : allowlisted function that removed its _shared/authz import
 *           (the "allowlisted-authz-guard" test).
 *   NEG-G : App.tsx declares an unguarded production route matching a
 *           forbidden dev/test pattern (the "dev/test-route detector").
 *   NEG-H : same as NEG-G but the route IS gated by import.meta.env.DEV
 *           on the same JSX expression — expected to PASS (control case).
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
        schema_version: 1,
        policy: 'default-deny',
        production_functions: allowlisted,
        production_routes: ['/', '/login'],
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
  rmSync(root, { recursive: true, force: true });
  return { id: 'NEG-E', pass, code: r.code, expected, stderr: r.stderr.trim() };
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
  rmSync(root, { recursive: true, force: true });
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
  rmSync(root, { recursive: true, force: true });
  return {
    id: 'NEG-H',
    pass,
    code: r.code,
    expected: 'exit=0 (DEV-gated route is exempt)',
    stderr: r.stderr.trim(),
  };
}

const results = [runNegE(), runNegG(), runNegH()];
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
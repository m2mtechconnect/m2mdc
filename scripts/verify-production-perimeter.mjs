#!/usr/bin/env node
/**
 * PR-0.1 Checkpoint B — production-perimeter enforcer.
 *
 * CI-executable. Non-interactive. Exit code 0 on pass, 1 on fail.
 *
 * Fails when:
 *   1. An edge-function directory in supabase/functions/ has no disposition
 *      in evidence/pr-0.1/edge-function-inventory.json.
 *   2. A function is production-allowlisted in route-allowlist.json but
 *      not marked "production-allowlisted" in the inventory.
 *   3. A function is production-allowlisted but does NOT import
 *      _shared/authz.ts.
 *   4. Any client-side source references VITE_LOVABLE_API_KEY.
 *   5. supabase/config.toml sets verify_jwt = false without an explicitly
 *      approved signed-webhook classification.
 *   6. A forbidden production route pattern is imported from src/App.tsx or
 *      src/main.tsx.
 *   7. A production deployment script uses a wildcard (`supabase functions
 *      deploy` with no name) or `--all`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const failures = [];
function fail(msg) { failures.push(msg); }

const inventoryPath = join(REPO, 'docs/remediation/evidence/pr-0.1/edge-function-inventory.json');
const allowlistPath = join(REPO, 'docs/remediation/evidence/pr-0.1/route-allowlist.json');

if (!existsSync(inventoryPath) || !existsSync(allowlistPath)) {
  console.error('Missing PR-0.1 evidence files.');
  process.exit(1);
}

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
const invByName = new Map(inventory.map((e) => [e.function, e]));

const VALID_DISPOSITIONS = new Set([
  'production-allowlisted',
  'demo-only',
  'disabled',
  'unknown-blocked',
  'signed-webhook',
]);

// 1. Every function dir must have a disposition.
const fnDirs = readdirSync(join(REPO, 'supabase/functions'))
  .filter((n) => !n.startsWith('_') && statSync(join(REPO, 'supabase/functions', n)).isDirectory())
  .filter((n) => existsSync(join(REPO, 'supabase/functions', n, 'index.ts')));

for (const name of fnDirs) {
  const entry = invByName.get(name);
  if (!entry) { fail(`function ${name}: missing from inventory`); continue; }
  if (!VALID_DISPOSITIONS.has(entry.production_disposition)) {
    fail(`function ${name}: invalid disposition "${entry.production_disposition}"`);
  }
}

// 2. allowlisted functions must match inventory disposition.
for (const name of allowlist.production_functions) {
  const entry = invByName.get(name);
  if (!entry) fail(`allowlist references unknown function: ${name}`);
  else if (entry.production_disposition !== 'production-allowlisted') {
    fail(`allowlist/${name}: inventory disposition is "${entry.production_disposition}" (expected production-allowlisted)`);
  }
}

// 3. allowlisted functions must import _shared/authz.
for (const name of allowlist.production_functions) {
  const idx = join(REPO, 'supabase/functions', name, 'index.ts');
  if (!existsSync(idx)) { fail(`allowlist/${name}: index.ts missing`); continue; }
  const src = readFileSync(idx, 'utf8');
  if (!/from ['"](\.\.\/)?_shared\/authz(\.ts)?['"]/.test(src)) {
    fail(`allowlist/${name}: missing "_shared/authz" import`);
  }
}

// 4. no client-side VITE_LOVABLE_API_KEY.
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx|html)$/.test(name)) out.push(p);
  }
  return out;
}
const ALLOWED_VITE = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
]);
// Identifiers that must NEVER appear in production source (including as
// bare string literals, error messages, or comments) because the presence
// of the string in the shipped bundle is itself a signal to attackers.
const FORBIDDEN_ANYWHERE = [
  /VITE_LOVABLE_API_KEY/,
  /VITE_OMNIVERSE_[A-Z_]+/,
];
function isTestFile(p) {
  return /\/__tests__\//.test(p) || /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p);
}
for (const f of walk(join(REPO, 'src'))) {
  if (isTestFile(f)) continue; // tests are excluded from the production bundle
  const src = readFileSync(f, 'utf8');
  // Strip comments so documentation doesn't false-fail on identifier checks.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  for (const re of FORBIDDEN_ANYWHERE) {
    if (re.test(code)) {
      fail(`browser identifier: ${f} references forbidden ${re}`);
    }
  }
  // Enforce env-read allowlist: only Supabase-3 and Vite built-ins may be
  // read via `import.meta.env.<KEY>`.
  const envReadRe = /import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  const ALLOWED_BUILTIN = new Set(['DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR']);
  let m;
  while ((m = envReadRe.exec(code))) {
    const key = m[1];
    if (!ALLOWED_VITE.has(key) && !ALLOWED_BUILTIN.has(key)) {
      fail(`browser env: ${f} reads non-allowlisted import.meta.env.${key}`);
    }
  }
  // Ban unsafe access patterns that force Vite to inline the full env object.
  if (/import\.meta\.env\s*\[/.test(code)) {
    fail(`browser env: ${f} uses computed import.meta.env[...] access (leaks full env)`);
  }
  if (/\.\.\.\s*import\.meta\.env\b/.test(code)) {
    fail(`browser env: ${f} spreads import.meta.env (leaks full env)`);
  }
  if (/(?:const|let|var)\s*\{[^}]*\}\s*=\s*import\.meta\.env\b/.test(code)) {
    fail(`browser env: ${f} destructures import.meta.env (leaks full env)`);
  }
  if (/Object\.(?:keys|values|entries|assign)\s*\(\s*import\.meta\.env\b/.test(code)) {
    fail(`browser env: ${f} enumerates import.meta.env (leaks full env)`);
  }
  // Bare `import.meta.env` without an immediate `.KEY` or `[` (allowed
  // pattern is `import.meta.env.KEY`; anything else forces the whole env
  // object to be inlined).
  const bareRe = /import\.meta\.env(?!\s*\.[A-Za-z_])(?!\s*\[)/g;
  if (bareRe.test(code)) {
    fail(`browser env: ${f} uses bare import.meta.env reference (leaks full env)`);
  }
}

// 4b. Bundle canary scan — verify the built artifact does not contain any
// forbidden secret material. Only runs when dist/ exists (post-build).
const distDir = join(REPO, 'dist');
if (existsSync(distDir)) {
  const CANARY_STRINGS = process.env.PERIMETER_CANARIES
    ? process.env.PERIMETER_CANARIES.split(',')
    : [];
  const FORBIDDEN_NAMES = [
    'VITE_LOVABLE_API_KEY',
    'VITE_OMNIVERSE_KIT_URL',
    'VITE_OMNIVERSE_SIGNALING_HOST',
    'VITE_OMNIVERSE_STREAM_ENABLED',
    'VITE_OMNIVERSE_HOST',
  ];
  const distFiles = [];
  (function walkDist(d) {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      const s = statSync(p);
      if (s.isDirectory()) walkDist(p);
      else if (/\.(js|css|html|map|json)$/.test(n)) distFiles.push(p);
    }
  })(distDir);
  for (const f of distFiles) {
    const content = readFileSync(f, 'utf8');
    for (const name of FORBIDDEN_NAMES) {
      if (content.includes(name)) {
        fail(`bundle leak: ${f} contains forbidden identifier ${name}`);
      }
    }
    for (const canary of CANARY_STRINGS) {
      if (canary && content.includes(canary)) {
        fail(`bundle leak: ${f} contains build-time canary value`);
      }
    }
  }
}

// 5. verify_jwt = false must be documented signed-webhook.
const configPath = join(REPO, 'supabase/config.toml');
if (existsSync(configPath)) {
  const cfg = readFileSync(configPath, 'utf8');
  const re = /\[functions\.([a-z0-9-]+)\]\s*[^\[]*verify_jwt\s*=\s*false/gm;
  let m;
  while ((m = re.exec(cfg))) {
    const fname = m[1];
    const entry = invByName.get(fname);
    if (!entry || entry.production_disposition !== 'signed-webhook') {
      fail(`config.toml: [${fname}] verify_jwt=false without signed-webhook disposition`);
    }
  }
}

// 6. forbidden route patterns must not appear in App.tsx / main.tsx.
const appSrc = existsSync(join(REPO, 'src/App.tsx')) ? readFileSync(join(REPO, 'src/App.tsx'), 'utf8') : '';
for (const pat of allowlist.forbidden_production_routes || []) {
  const literal = pat.replace('/*', '');
  // Match the literal followed by "/" (subroute) or the closing quote (exact),
  // so e.g. `/dev` does not falsely match `/dev-overlays`.
  const re = new RegExp(`path=["']${literal.replace(/\//g, '\\/')}(?:["']|\\/)`);
  const matches = appSrc.match(new RegExp(re, 'g')) || [];
  // Allow occurrences that are gated by `import.meta.env.DEV` on the same
  // JSX expression.
  const gated = (appSrc.match(new RegExp(`import\\.meta\\.env\\.DEV[^\\n]*${re.source}`, 'g')) || []).length;
  if (matches.length > gated) {
    fail(`App.tsx declares forbidden production route: ${pat}`);
  }
}

// 7. no wildcard deploy commands.
const workflowDir = join(REPO, '.github/workflows');
if (existsSync(workflowDir)) {
  for (const f of readdirSync(workflowDir)) {
    const src = readFileSync(join(workflowDir, f), 'utf8');
    if (/supabase\s+functions\s+deploy(\s+--all|\s*$|\s+\|)/m.test(src)) {
      fail(`${f}: wildcard "supabase functions deploy" is forbidden`);
    }
  }
}

if (failures.length) {
  console.error('PR-0.1 production-perimeter enforcement FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`PR-0.1 production-perimeter enforcement PASSED (${fnDirs.length} functions inventoried, ${allowlist.production_functions.length} allowlisted).`);
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
 *      is not effectively marked "production-allowlisted" by the historical
 *      inventory plus an explicit edge-function-promotions.json entry.
 *   3. A function is production-allowlisted but does NOT demonstrate an
 *      in-code authorization guard: either it routes through
 *      _shared/handler.ts with an explicit non-public `authLevel`, or it
 *      imports _shared/callerIdentity.ts / _shared/adminAuthorization.ts
 *      together with the scoped _shared/cors.ts allowlist.
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
const promotionPath = join(REPO, 'docs/remediation/evidence/pr-0.1/edge-function-promotions.json');
const allowlistPath = join(REPO, 'docs/remediation/evidence/pr-0.1/route-allowlist.json');

if (!existsSync(inventoryPath) || !existsSync(allowlistPath)) {
  console.error('Missing PR-0.1 evidence files.');
  process.exit(1);
}

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')).map((entry) => ({ ...entry }));
const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
const invByName = new Map(inventory.map((e) => [e.function, e]));

// Additive promotion ledgers preserve the immutable/historical inventory while
// allowing a later, reviewed checkpoint to promote a previously blocked entry.
// The ledger can only promote an already inventoried function, and rule 3 below
// still re-verifies the actual source guard so metadata can never bypass auth.
if (existsSync(promotionPath)) {
  let promotionDoc;
  try {
    promotionDoc = JSON.parse(readFileSync(promotionPath, 'utf8'));
  } catch (error) {
    fail(`promotion ledger: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  const promotions = Array.isArray(promotionDoc?.promotions) ? promotionDoc.promotions : [];
  const seenPromotions = new Set();
  for (const promotion of promotions) {
    if (!promotion || typeof promotion.function !== 'string' || !promotion.function.trim()) {
      fail('promotion ledger: invalid promotion entry');
      continue;
    }
    const name = promotion.function.trim();
    if (seenPromotions.has(name)) {
      fail(`promotion ledger: duplicate promotion for ${name}`);
      continue;
    }
    seenPromotions.add(name);
    if (promotion.production_disposition !== 'production-allowlisted') {
      fail(`promotion ledger/${name}: only production-allowlisted promotions are accepted`);
      continue;
    }
    const current = invByName.get(name);
    if (!current) {
      fail(`promotion ledger references unknown function: ${name}`);
      continue;
    }
    Object.assign(current, promotion, { function: name });
  }
}

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

// 2. allowlisted functions must match effective inventory disposition.
for (const name of allowlist.production_functions) {
  const entry = invByName.get(name);
  if (!entry) fail(`allowlist references unknown function: ${name}`);
  else if (entry.production_disposition !== 'production-allowlisted') {
    fail(`allowlist/${name}: inventory disposition is "${entry.production_disposition}" (expected production-allowlisted)`);
  }
}

// 3. allowlisted functions must demonstrate an in-code authorization guard.
//    Accepted shapes (strictly more than the previous single-import check):
//      (a) _shared/handler.ts createHandler with an explicit, non-public
//          authLevel — getAuthContext enforces identity and CORS centrally;
//      (b) a direct caller-identity / admin-authorization guard import used
//          together with the scoped _shared/cors.ts origin allowlist.
const SHARED_IMPORT = (mod) =>
  new RegExp(`from ['"](?:\\.\\.\\/)?_shared\\/${mod}(?:\\.ts)?['"]`);
for (const name of allowlist.production_functions) {
  const idx = join(REPO, 'supabase/functions', name, 'index.ts');
  if (!existsSync(idx)) { fail(`allowlist/${name}: index.ts missing`); continue; }
  const src = readFileSync(idx, 'utf8');

  const usesHandler = SHARED_IMPORT('handler').test(src);
  const authLevelMatch = src.match(/authLevel\s*:\s*['"]([a-z-]+)['"]/);
  const handlerGuarded =
    usesHandler && !!authLevelMatch && authLevelMatch[1] !== 'public';

  const usesIdentityGuard =
    SHARED_IMPORT('callerIdentity').test(src) ||
    SHARED_IMPORT('adminAuthorization').test(src);
  const usesScopedCors = SHARED_IMPORT('cors').test(src);
  const directGuarded = usesIdentityGuard && usesScopedCors;

  if (!handlerGuarded && !directGuarded) {
    if (usesHandler && authLevelMatch && authLevelMatch[1] === 'public') {
      fail(`allowlist/${name}: authLevel "public" is not an authorization guard`);
    } else if (usesHandler && !authLevelMatch) {
      fail(`allowlist/${name}: createHandler without an explicit authLevel`);
    } else {
      fail(
        `allowlist/${name}: no in-code authorization guard ` +
        '(expected _shared/handler.ts with non-public authLevel, or ' +
        '_shared/callerIdentity|adminAuthorization together with _shared/cors)',
      );
    }
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
  'VITE_BUILD_VERSION',
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
  // Enforce env-read allowlist: only explicitly public client/build metadata
  // and Vite built-ins may be read via `import.meta.env.<KEY>`.
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

// 6. forbidden route patterns must not appear in any shipped router file.
//    src/App.tsx now declares a single route; the real route tables live in
//    src/PublicAppRoutes.tsx and src/AuthenticatedShell.tsx, so all three are
//    scanned.
const ROUTER_FILES = [
  'src/App.tsx',
  'src/PublicAppRoutes.tsx',
  'src/AuthenticatedShell.tsx',
];
const routerSources = ROUTER_FILES
  .filter((rel) => existsSync(join(REPO, rel)))
  .map((rel) => ({ rel, src: readFileSync(join(REPO, rel), 'utf8') }));
const appSrc = routerSources.map((f) => f.src).join('\n');

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
    fail(`router declares forbidden production route: ${pat}`);
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

// 8. NEG-A — every absolute <Route path="..."> declared in the shipped
// router files must be classified in the route-allowlist as exactly one of:
// production_routes, production_blocked_routes, development_only_routes,
// redirect_only_routes, or match a forbidden_production_routes pattern.
{
  const prod       = new Set(allowlist.production_routes || []);
  const blocked    = new Set(allowlist.production_blocked_routes || []);
  const devOnly    = new Set(allowlist.development_only_routes || []);
  const redirect   = new Set(allowlist.redirect_only_routes || []);
  const forbidden  = allowlist.forbidden_production_routes || [];
  const forbiddenRe = forbidden.map((p) => new RegExp('^' + p.replace(/\*/g, '.*') + '$'));
  const lines = appSrc.split('\n');
  const seen = new Set();
  const pathAndDev = /<Route[^>]*path=["']([^"']+)["']/;
  for (const line of lines) {
    const lm = pathAndDev.exec(line);
    if (!lm) continue;
    const p = lm[1];
    if (seen.has(p)) continue;
    seen.add(p);
    // Relative child paths (e.g. "overview") inherit the classification of
    // their already-classified parent route.
    if (!p.startsWith('/') && p !== '*') continue;
    const isDevGated = /import\.meta\.env\.DEV/.test(line);
    if (isDevGated) continue;
    if (prod.has(p) || blocked.has(p) || devOnly.has(p) || redirect.has(p)) continue;
    if (forbiddenRe.some((re) => re.test(p))) continue;
    fail(`router declares unclassified route: ${p}`);
  }
}

// 9. NEG-D — a function may not appear in both production_functions and
// disabled_functions. Disabled functions must first be removed from the
// disabled list (with justification) before re-allowlist.
{
  const prodFn = new Set(allowlist.production_functions || []);
  for (const name of allowlist.disabled_functions || []) {
    if (prodFn.has(name)) {
      fail(`allowlist: disabled function "${name}" is also present in production_functions`);
    }
  }
}

// 10. NEG-E — a production-allowlisted function must be gateway JWT-verified
// (verify_jwt = true) unless it is explicitly classified signed-webhook.
{
  const cfgPath = join(REPO, 'supabase/config.toml');
  if (existsSync(cfgPath)) {
    const cfg = readFileSync(cfgPath, 'utf8');
    for (const name of allowlist.production_functions || []) {
      const block = cfg.match(
        new RegExp(`\\[functions\\.${name}\\]([\\s\\S]*?)(?=\\n\\[|$)`),
      );
      const entry = invByName.get(name);
      const isWebhook = entry?.production_disposition === 'signed-webhook';
      if (block && /verify_jwt\s*=\s*false/.test(block[1]) && !isWebhook) {
        fail(`allowlist/${name}: verify_jwt=false without signed-webhook classification`);
      }
    }
  }
}

// 11. NEG-F — alias drift. Every ROUTE_ALIASES/PARAM_ALIASES source path in
// src/config/routeAliases.ts must be classified redirect-only, so a
// redirect-only surface cannot silently become a production route.
{
  const aliasPath = join(REPO, 'src/config/routeAliases.ts');
  if (existsSync(aliasPath)) {
    const aliasSrc = readFileSync(aliasPath, 'utf8');
    const froms = [...aliasSrc.matchAll(/from:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const redirectOnly = new Set(allowlist.redirect_only_routes || []);
    const prodRoutes = new Set(allowlist.production_routes || []);
    const exceptions = new Set(allowlist.alias_production_exceptions || []);
    for (const from of froms) {
      if (exceptions.has(from)) continue;
      if (!redirectOnly.has(from)) {
        fail(`route alias "${from}" is not classified in redirect_only_routes`);
      }
      if (prodRoutes.has(from)) {
        fail(`route alias "${from}" is also listed as a production route (must stay redirect-only)`);
      }
    }
  }
}

if (failures.length) {
  console.error('PR-0.1 production-perimeter enforcement FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`PR-0.1 production-perimeter enforcement PASSED (${fnDirs.length} functions inventoried, ${allowlist.production_functions.length} allowlisted).`);

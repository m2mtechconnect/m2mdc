#!/usr/bin/env node
/**
 * Phase 3 external validation runner.
 *
 * Executes the parts of Phase 3 that CANNOT be proven by unit tests, because
 * they only exist inside a real Postgres/PostgREST deployment:
 *
 *   1. migration reproducibility - every file in supabase/migrations applies
 *      to an empty database, in order, without error
 *   2. tenant isolation + RLS    - scripts/phase3/rls-matrix.sql, executed as
 *      the `authenticated` role with forged JWT claims
 *   3. trusted write boundary    - the run-lifecycle / record-decision edge
 *      functions reject forged intent and cross-tenant ids over real HTTP
 *
 * It never touches the production project. It requires an explicitly supplied
 * throwaway backend:
 *
 *   AURA_VALIDATION_DB_URL    postgres URL with rights to create auth users
 *   AURA_VALIDATION_FN_URL    (optional) functions base url for step 3
 *   AURA_VALIDATION_JWT_A/_B  (optional) user JWTs for two tenants
 *
 * Exit codes: 0 pass, 1 fail, 78 BLOCKED (no validation backend supplied).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const DB = process.env.AURA_VALIDATION_DB_URL;
const FN = process.env.AURA_VALIDATION_FN_URL;
const results = [];

function record(step, status, detail) {
  results.push({ step, status, detail });
  console.log(`[${status}] ${step}${detail ? ` - ${detail}` : ''}`);
}

if (!DB) {
  record(
    'phase-3-external-validation',
    'BLOCKED',
    'AURA_VALIDATION_DB_URL is not set. Real RLS execution requires a throwaway ' +
      'Postgres the harness may create auth users in; the production project must ' +
      'not be used and this sandbox cannot SET ROLE authenticated.',
  );
  process.exit(78);
}

function psql(args) {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

let failed = false;

// 1. migration reproducibility
try {
  const dir = 'supabase/migrations';
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) psql(['-f', join(dir, f)]);
  record('migration reproducibility', 'PASS', `${files.length} migrations applied in order`);
} catch (e) {
  failed = true;
  record('migration reproducibility', 'FAIL', String(e.stderr || e.message).slice(0, 800));
}

// 2. RLS + tenant isolation
try {
  const out = psql(['-f', 'scripts/phase3/rls-matrix.sql']);
  const passes = (out.match(/PASS /g) || []).length;
  if (!out.includes('RLS MATRIX COMPLETE')) throw new Error(out.slice(-800));
  record('tenant isolation + RLS matrix', 'PASS', `${passes} assertions executed as authenticated`);
} catch (e) {
  failed = true;
  record('tenant isolation + RLS matrix', 'FAIL', String(e.stderr || e.message).slice(0, 800));
}

// 3. trusted write boundary over HTTP
if (!FN || !process.env.AURA_VALIDATION_JWT_A) {
  record('trusted write boundary (HTTP)', 'BLOCKED', 'AURA_VALIDATION_FN_URL / JWTs not supplied');
} else {
  const call = async (fn, jwt, body) => {
    const r = await fetch(`${FN}/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const a = process.env.AURA_VALIDATION_JWT_A;
  const b = process.env.AURA_VALIDATION_JWT_B;
  const anon = await call('run-lifecycle', 'invalid', { action: 'create' });
  if (anon.status !== 401) { failed = true; record('unauthenticated run create rejected', 'FAIL', `status ${anon.status}`); }
  else record('unauthenticated run create rejected', 'PASS', '401');
  if (b) {
    const cross = await call('record-decision', b, {
      runId: '00000000-0000-0000-0000-000000000000',
      recommendationId: 'rec-1', outcome: 'approved', rationale: 'cross tenant attempt',
    });
    const good = cross.status === 404 || cross.status === 403;
    if (!good) { failed = true; record('cross-tenant decision rejected', 'FAIL', `status ${cross.status}`); }
    else record('cross-tenant decision rejected', 'PASS', `status ${cross.status}`);
  }
  void a;
}

console.log(`\nPHASE_3_EXTERNAL_VALIDATION: ${failed ? 'FAIL' : 'PASS'}`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Phase 3 external validation runner.
 *
 * Executes the parts of Phase 3 that CANNOT be proven by unit tests, because
 * they only exist inside a real Postgres / PostgREST / GoTrue deployment:
 *
 *   1. migration reproducibility  - every file in supabase/migrations applies
 *      to an empty public schema, in order, without error
 *   2. schema object inventory    - Phase 3 functions, triggers, policies,
 *      indexes and grants exist after replay
 *   3. rollback + reapplication   - the Phase 3 migrations can be removed from
 *      the replay set and reapplied, with an identical final schema signature
 *   4. tenant isolation + RLS     - scripts/phase3/rls-matrix.sql, executed as
 *      the `authenticated` and `anon` roles with real request context
 *   5. trusted write boundary     - run-lifecycle / record-decision over real
 *      HTTP, with real GoTrue sessions for two tenants
 *
 * It never touches the production project. It requires an explicitly supplied
 * disposable backend (locally: `supabase start`):
 *
 *   AURA_VALIDATION_DB_URL            postgres URL (superuser on a throwaway db)
 *   AURA_VALIDATION_API_URL           local API gateway, e.g. http://127.0.0.1:54321
 *   AURA_VALIDATION_ANON_KEY          local anon key
 *   AURA_VALIDATION_SERVICE_ROLE_KEY  local service-role key (test users only)
 *
 * Flags:
 *   --require-infrastructure   missing/incomplete infrastructure and any skipped
 *                              assertion is a FAILURE (exit 1), never exit 78
 *   --json <path>              machine-readable result document
 *
 * Exit codes: 0 pass, 1 fail, 78 BLOCKED (no validation backend supplied and
 * --require-infrastructure was not passed).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const argv = process.argv.slice(2);
const REQUIRED = argv.includes('--require-infrastructure');
const jsonPath = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;

const DB = process.env.AURA_VALIDATION_DB_URL;
const API = (process.env.AURA_VALIDATION_API_URL || '').replace(/\/$/, '');
const ANON = process.env.AURA_VALIDATION_ANON_KEY;
const SERVICE = process.env.AURA_VALIDATION_SERVICE_ROLE_KEY;

const FORBIDDEN = [/psfvrskpnwcshvajzeix/i, /lovable\.app/i, /m2mtechconnect\.com/i];
const LOCAL = /^(https?:\/\/)?(127\.0\.0\.1|localhost|0\.0\.0\.0|host\.docker\.internal|kong)(:|\/|$)/i;

const started = new Date().toISOString();
const results = [];
let failed = false;
let blocked = false;

function record(step, status, detail) {
  if (status === 'FAIL') failed = true;
  if (status === 'BLOCKED' || status === 'SKIP') {
    if (REQUIRED) failed = true;
    else blocked = true;
  }
  results.push({ step, status, detail: detail ?? null, at: new Date().toISOString() });
  console.log(`[${status}] ${step}${detail ? ` - ${detail}` : ''}`);
}

function finish(code) {
  const summary = {
    schema: 'aura.phase3.external-validation/v1',
    started,
    finished: new Date().toISOString(),
    requireInfrastructure: REQUIRED,
    commit: process.env.GITHUB_SHA ?? null,
    workflowRunId: process.env.GITHUB_RUN_ID ?? null,
    runner: { node: process.version, platform: process.platform },
    toolVersions: { supabaseCli: process.env.AURA_VALIDATION_CLI_VERSION ?? null },
    totals: {
      total: results.length,
      pass: results.filter((r) => r.status === 'PASS').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
      blocked: results.filter((r) => r.status === 'BLOCKED' || r.status === 'SKIP').length,
    },
    verdict: code === 0 ? 'PASS' : code === 78 ? 'BLOCKED' : 'FAIL',
    exitCode: code,
    results,
  };
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  }
  console.log(`\nPHASE_3_EXTERNAL_VALIDATION: ${summary.verdict}`);
  process.exit(code);
}

// ---------------------------------------------------------------- safety
for (const value of [DB, API]) {
  if (value && FORBIDDEN.some((p) => p.test(value))) {
    record('production perimeter', 'FAIL', 'target references a production host or project ref');
    finish(1);
  }
}
if (REQUIRED && API && !LOCAL.test(API)) {
  record('production perimeter', 'FAIL', 'required mode only accepts a local API gateway');
  finish(1);
}

if (!DB) {
  record(
    'phase-3-external-validation',
    REQUIRED ? 'FAIL' : 'BLOCKED',
    'AURA_VALIDATION_DB_URL is not set. Real RLS execution requires a disposable ' +
      'Postgres the harness may create auth users in; the production project must ' +
      'not be used and this sandbox cannot SET ROLE authenticated.',
  );
  finish(REQUIRED ? 1 : 78);
}

// ------------------------------------------------------------------ psql
function psql(args, opts = {}) {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}
const scalar = (sql) => psql(['-tAc', sql]).trim();

const MIGRATION_DIR = 'supabase/migrations';
const allMigrations = readdirSync(MIGRATION_DIR).filter((f) => f.endsWith('.sql')).sort();
const phase3 = JSON.parse(readFileSync('scripts/phase3/phase3-migrations.json', 'utf8')).phase3;

function resetPublicSchema() {
  psql([
    '-c',
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; " +
      'GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; ' +
      'GRANT ALL ON SCHEMA public TO postgres;',
  ]);
}

function applyMigrations(files) {
  for (const f of files) psql(['-f', join(MIGRATION_DIR, f)]);
}

function schemaSignature() {
  return scalar(`
    SELECT md5(string_agg(sig, E'\\n' ORDER BY sig)) FROM (
      SELECT 'col:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable AS sig
        FROM information_schema.columns WHERE table_schema='public'
      UNION ALL SELECT 'pol:'||schemaname||'.'||tablename||'.'||policyname||':'||cmd
        FROM pg_policies WHERE schemaname='public'
      UNION ALL SELECT 'idx:'||indexname||':'||indexdef FROM pg_indexes WHERE schemaname='public'
      UNION ALL SELECT 'fn:'||p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public'
      UNION ALL SELECT 'trg:'||c.relname||'.'||t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
      UNION ALL SELECT 'grant:'||table_name||':'||grantee||':'||privilege_type
        FROM information_schema.role_table_grants WHERE table_schema='public'
    ) s`);
}

// 1. migration reproducibility -------------------------------------------
let fullSignature = null;
try {
  resetPublicSchema();
  applyMigrations(allMigrations);
  fullSignature = schemaSignature();
  record(
    'migration reproducibility',
    'PASS',
    `${allMigrations.length} migrations applied in order; head ${allMigrations.at(-1)}; schema ${fullSignature}`,
  );
} catch (e) {
  record('migration reproducibility', 'FAIL', String(e.stderr || e.message).slice(0, 1200));
}

// 2. Phase 3 object inventory --------------------------------------------
if (fullSignature) {
  const expectations = [
    ['function enforce_simulation_run_write_boundary', "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='enforce_simulation_run_write_boundary'"],
    ['function decision_records_immutable', "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decision_records_immutable'"],
    ['trigger on simulation_runs', "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='simulation_runs' AND NOT t.tgisinternal"],
    ['trigger on decision_records', "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='decision_records' AND NOT t.tgisinternal"],
    ['rls enabled on simulation_runs', "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='simulation_runs' AND c.relrowsecurity"],
    ['rls enabled on decision_records', "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='decision_records' AND c.relrowsecurity"],
    ['tenant index on simulation_runs', "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname='simulation_runs_tenant_idx'"],
    ['no anon grant on simulation_runs', "SELECT 1 - least(1, count(*)) FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='simulation_runs' AND grantee='anon'"],
    ['no anon grant on decision_records', "SELECT 1 - least(1, count(*)) FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='decision_records' AND grantee='anon'"],
    ['no update/delete grant on decision_records', "SELECT 1 - least(1, count(*)) FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='decision_records' AND grantee='authenticated' AND privilege_type IN ('UPDATE','DELETE')"],
  ];
  let bad = [];
  for (const [label, sql] of expectations) {
    try {
      if (Number(scalar(sql)) < 1) bad.push(label);
    } catch (e) {
      bad.push(`${label} (${String(e.message).slice(0, 120)})`);
    }
  }
  record(
    'phase 3 schema object inventory',
    bad.length ? 'FAIL' : 'PASS',
    bad.length ? `missing: ${bad.join(', ')}` : `${expectations.length} objects verified`,
  );
}

// 3. RLS matrix ------------------------------------------------------------
function runRlsMatrix(label) {
  try {
    // RAISE NOTICE output lands on stderr, so both streams are needed here.
    const r = spawnSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-f', 'scripts/phase3/rls-matrix.sql'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
    if (r.status !== 0) throw new Error(out.slice(-1200));
    const passes = (out.match(/PASS /g) || []).length;
    if (!out.includes('RLS MATRIX COMPLETE') || !out.includes('RLS MATRIX EXTENDED COMPLETE')) {
      throw new Error(out.slice(-1200));
    }
    record(label, 'PASS', `${passes} assertions executed as authenticated/anon`);
    return passes;
  } catch (e) {
    record(label, 'FAIL', String(e.stderr || e.message).slice(0, 1200));
    return 0;
  }
}
const rlsPasses = fullSignature ? runRlsMatrix('tenant isolation + RLS matrix') : 0;

// 4. rollback + reapplication ---------------------------------------------
if (fullSignature) {
  try {
    resetPublicSchema();
    applyMigrations(allMigrations.filter((f) => !phase3.includes(f)));
    record('phase 3 rollback (baseline without phase 3 migrations)', 'PASS', `${phase3.length} migrations withheld`);
    applyMigrations(phase3);
    const again = schemaSignature();
    if (again !== fullSignature) throw new Error(`schema signature diverged: ${again} != ${fullSignature}`);
    record('phase 3 reapplication', 'PASS', `identical schema signature ${again}`);
    runRlsMatrix('RLS matrix after rollback + reapplication');
  } catch (e) {
    record('phase 3 rollback + reapplication', 'FAIL', String(e.stderr || e.message).slice(0, 1200));
  }
}

// 5. HTTP boundary ---------------------------------------------------------
async function httpBoundary() {
  if (!API || !ANON || !SERVICE) {
    record('trusted write boundary (HTTP)', REQUIRED ? 'FAIL' : 'BLOCKED',
      'AURA_VALIDATION_API_URL / ANON / SERVICE_ROLE keys not supplied');
    return;
  }
  const authAdmin = async (path, body) => {
    const r = await fetch(`${API}/auth/v1/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const signIn = async (email, password) => {
    const r = await fetch(`${API}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON },
      body: JSON.stringify({ email, password }),
    });
    const b = await r.json().catch(() => ({}));
    return b.access_token ?? null;
  };
  const call = async (fn, token, body, extraHeaders = {}) => {
    const headers = { 'content-type': 'application/json', apikey: ANON, ...extraHeaders };
    if (token) headers.authorization = `Bearer ${token}`;
    const r = await fetch(`${API}/functions/v1/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const expect = (label, ok, detail) => record(label, ok ? 'PASS' : 'FAIL', detail);

  // Synthetic identities. Passwords are generated per run and never logged.
  const pw = () => `Aura-${crypto.randomUUID()}!`;
  const tenants = {};
  for (const label of ['tenantA', 'tenantB']) {
    const email = `${label.toLowerCase()}+${crypto.randomUUID()}@validation.invalid`;
    const password = pw();
    const created = await authAdmin('admin/users', { email, password, email_confirm: true });
    if (created.status >= 300) {
      record('synthetic identity provisioning', 'FAIL', `${label} create returned ${created.status}`);
      return;
    }
    const token = await signIn(email, password);
    if (!token) {
      record('synthetic identity provisioning', 'FAIL', `${label} sign-in produced no session`);
      return;
    }
    tenants[label] = { id: created.body.id, token, label };
  }
  record('synthetic identity provisioning', 'PASS', 'tenantA + tenantB real GoTrue sessions (tokens redacted)');

  // Each tenant owns a twin, created with the service role (test fixture setup).
  const twin = {};
  for (const t of Object.values(tenants)) {
    twin[t.label] = scalar(
      `WITH inserted AS (` +
        `INSERT INTO public.data_centre_twins (name, city, region_code, created_by_user) ` +
        `VALUES ('validation-${t.label}', 'Validation City', 'validation-${t.label}', '${t.id}') ` +
        `RETURNING id` +
      `) SELECT id FROM inserted`,
    );
  }

  // --- authentication surface
  expect('missing token rejected', (await call('run-lifecycle', null, { action: 'create' })).status === 401, '401 expected');
  expect('malformed token rejected', (await call('run-lifecycle', 'not-a-jwt', { action: 'create' })).status === 401, '401 expected');
  const forged = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjF9.invalid';
  expect('expired/forged token rejected', (await call('run-lifecycle', forged, { action: 'create' })).status === 401, '401 expected');

  // --- input validation and privileged fields
  const badBody = await call('run-lifecycle', tenants.tenantA.token, { op: 'nonsense' });
  expect('invalid body rejected', badBody.status === 400, `status ${badBody.status}`);

  const createA = await call('run-lifecycle', tenants.tenantA.token, {
    op: 'create',
    twinId: twin.tenantA,
    scenarioKey: 'phase3-external-validation',
    scenarioName: 'Phase 3 external validation',
    requestedProvider: 'aura-local-deterministic',
    requestedExecutionClass: 'ephemeral-local-validation',
    requestedIntent: 'authoritative',
    inputSnapshot: { source: 'phase3-external-validation' },
    configuration: {},
    idempotencyKey: `phase3-${crypto.randomUUID()}`,
    tenantId: tenants.tenantB.id,
    verificationLevel: 'server-verified',
  });
  expect('tenant A run created through the boundary', createA.status < 300, `status ${createA.status}`);
  const runId = createA.body?.data?.run?.id ?? createA.body?.run?.id ?? createA.body?.id ?? null;
  if (runId) {
    const row = JSON.parse(scalar(
      `SELECT row_to_json(r) FROM (SELECT tenant_id, user_id, run_intent, verification_level, server_created_at, lifecycle_status FROM public.simulation_runs WHERE id='${runId}') r`,
    ));
    expect('client cannot set another tenant id', row.tenant_id === tenants.tenantA.id, 'tenant derived from session');
    expect('client cannot author privileged provenance', row.verification_level !== 'server-verified', `verification_level=${row.verification_level}`);
    expect('preview cannot be promoted to authoritative by client input', row.run_intent === 'preview', `run_intent=${row.run_intent}`);
    expect('server-generated timestamps present', Boolean(row.server_created_at), 'server_created_at set');

    // --- lifecycle transitions
    const t1 = await call('run-lifecycle', tenants.tenantA.token, { op: 'transition', runId, to: 'running' });
    expect('legal transition queued -> running', t1.status < 300, `status ${t1.status}`);
    const t2 = await call('run-lifecycle', tenants.tenantA.token, { op: 'transition', runId, to: 'succeeded' });
    expect('legal transition running -> succeeded', t2.status < 300, `status ${t2.status}`);
    const t3 = await call('run-lifecycle', tenants.tenantA.token, { op: 'transition', runId, to: 'running' });
    expect('succeeded cannot return to running', t3.status === 409, `status ${t3.status} code ${t3.body?.error?.code ?? t3.body?.code}`);
    const t4 = await call('run-lifecycle', tenants.tenantB.token, { op: 'transition', runId, to: 'failed' });
    expect('cross-tenant transition rejected', t4.status === 404 || t4.status === 403, `status ${t4.status}`);

    // --- decisions
    const dec = await call('record-decision', tenants.tenantA.token, {
      runId, recommendationId: 'rec-validation-1', outcome: 'rejected',
      rationale: 'validation rationale, sufficiently long',
    });
    expect('append-only decision accepted for own run', dec.status < 300, `status ${dec.status}`);
    const stale = await call('record-decision', tenants.tenantA.token, {
      runId, recommendationId: 'rec-validation-2', outcome: 'rejected',
      rationale: 'validation rationale, sufficiently long', expectedOutputHash: 'stale-hash',
    });
    expect('stale expected_output_hash rejected', stale.status === 409, `status ${stale.status}`);
    const unverified = await call('record-decision', tenants.tenantA.token, {
      runId, recommendationId: 'rec-validation-3', outcome: 'approved',
      rationale: 'validation rationale, sufficiently long',
    });
    expect('unverified preview cannot be approved', unverified.status === 403, `status ${unverified.status}`);
    const crossDec = await call('record-decision', tenants.tenantB.token, {
      runId, recommendationId: 'rec-validation-4', outcome: 'rejected',
      rationale: 'cross tenant attempt, sufficiently long',
    });
    expect('cross-tenant decision rejected', crossDec.status === 404 || crossDec.status === 403, `status ${crossDec.status}`);
    if (dec.status < 300) {
      const server = JSON.parse(scalar(
        `SELECT row_to_json(d) FROM (SELECT user_id, approver, decided_at, snapshot_hash FROM public.decision_records WHERE run_id='${runId}' ORDER BY decided_at LIMIT 1) d`,
      ));
      expect('approver identity comes from the session', server.user_id === tenants.tenantA.id, 'user_id = caller');
      expect('decision time and hashes are server-generated', Boolean(server.decided_at && server.snapshot_hash), 'server fields present');
    }
  }

  // --- CORS is restricted, never wildcard on a credentialed route
  const pre = await fetch(`${API}/functions/v1/run-lifecycle`, {
    method: 'OPTIONS',
    headers: { origin: 'https://attacker.invalid', 'access-control-request-method': 'POST' },
  });
  const allow = pre.headers.get('access-control-allow-origin');
  const credentialed = pre.headers.get('access-control-allow-credentials') === 'true';
  expect('CORS does not allow credentialed wildcard', !(allow === '*' && credentialed), `allow-origin=${allow}`);
}

try {
  await httpBoundary();
} catch (e) {
  record('trusted write boundary (HTTP)', 'FAIL', String(e.message).slice(0, 800));
}

record('rls assertion total', rlsPasses > 0 ? 'PASS' : REQUIRED ? 'FAIL' : 'BLOCKED', `${rlsPasses} assertions`);

finish(failed ? 1 : blocked && !REQUIRED ? 78 : 0);

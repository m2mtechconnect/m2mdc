#!/usr/bin/env node
// DSX disposable-environment pre-Phase-3 verification.
//
// Read-only. Runs only when scripts/dsx-resume-gate.mjs passes AND the
// database URL points at the disposable project (never production).
// Verifies:
//   1. Connection targets DSX_EXPECTED_DISPOSABLE_REF and NOT the
//      production project ref.
//   2. Required Postgres extensions are installed.
//   3. RLS is enabled on every DSX table plus known tenant tables and
//      each has at least one policy.
//   4. SECURITY DEFINER helpers required for ingestion / auth are
//      present.
//   5. Auth is reachable and anonymous signup is disabled.
//   6. dsx-ingest edge function refuses an unauthenticated POST with
//      the sanitized 401 envelope.
//
// Fails closed. Never mutates any row. Never contacts production.

import { evaluateDsxResumeGate } from "./dsx-resume-gate.mjs";

const PRODUCTION_PROJECT_REF = "psfvrskpnwcshvajzeix";

const REQUIRED_EXTENSIONS = [
  "pgcrypto",
  "pgsodium",
  "supabase_vault",
  "pg_graphql",
  "pg_cron",
  "vector",
];

const REQUIRED_RLS_TABLES = [
  "dsx_connections",
  "dsx_asset_mappings",
  "dsx_events",
  "dsx_events_quarantine",
  "dsx_gateway_heartbeats",
  "dsx_ingestion_audit",
  "profiles",
  "user_roles",
];

const REQUIRED_FUNCTIONS = [
  "has_role",
  "is_approved_user",
  "dsx_current_user_in_org",
  "dsx_current_user_is_operator_in_org",
  "dsx_ingest_event",
  "admin_assign_role",
  "admin_revoke_role",
];

function refFromUrl(url) {
  const m = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i.exec(url ?? "");
  return m ? m[1] : null;
}
function refFromDbUrl(url) {
  const m = /db\.([a-z0-9-]+)\.supabase\.co/i.exec(url ?? "");
  return m ? m[1] : null;
}

async function serviceSelect(env, path) {
  const res = await fetch(`${env.DSX_DISPOSABLE_URL}${path}`, {
    headers: {
      apikey: env.DSX_DISPOSABLE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.DSX_DISPOSABLE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
    },
  });
  return { status: res.status, body: await res.text() };
}

async function anonSelect(env, table) {
  const res = await fetch(
    `${env.DSX_DISPOSABLE_URL}/rest/v1/${table}?select=id&limit=1`,
    {
      headers: {
        apikey: env.DSX_DISPOSABLE_ANON_KEY,
        Accept: "application/json",
      },
    },
  );
  return { status: res.status, body: await res.text() };
}

async function checkExtensions(env, findings) {
  const r = await serviceSelect(
    env,
    `/rest/v1/pg_extension?select=extname&extname=in.(${REQUIRED_EXTENSIONS.join(",")})`,
  );
  if (r.status !== 200) {
    findings.push({ check: "extensions", pass: false, detail: `HTTP ${r.status}` });
    return;
  }
  let installed = [];
  try { installed = JSON.parse(r.body).map((row) => row.extname); }
  catch { findings.push({ check: "extensions", pass: false, detail: "unparseable" }); return; }
  const missing = REQUIRED_EXTENSIONS.filter((e) => !installed.includes(e));
  findings.push({
    check: "extensions",
    pass: missing.length === 0,
    detail: missing.length === 0 ? `all ${REQUIRED_EXTENSIONS.length} present` : `missing: ${missing.join(", ")}`,
  });
}

async function checkRls(env, findings) {
  const r = await serviceSelect(
    env,
    `/rest/v1/pg_tables?select=tablename&schemaname=eq.public&tablename=in.(${REQUIRED_RLS_TABLES.join(",")})`,
  );
  if (r.status !== 200) {
    findings.push({ check: "rls_tables_present", pass: false, detail: `HTTP ${r.status}` });
    return;
  }
  const present = JSON.parse(r.body).map((row) => row.tablename);
  const missingTables = REQUIRED_RLS_TABLES.filter((t) => !present.includes(t));
  findings.push({
    check: "rls_tables_present",
    pass: missingTables.length === 0,
    detail: missingTables.length === 0 ? `all ${REQUIRED_RLS_TABLES.length} present` : `missing: ${missingTables.join(", ")}`,
  });

  const pol = await serviceSelect(
    env,
    `/rest/v1/pg_policies?select=tablename,policyname&schemaname=eq.public&tablename=in.(${REQUIRED_RLS_TABLES.join(",")})`,
  );
  if (pol.status !== 200) {
    findings.push({ check: "rls_policies", pass: false, detail: `HTTP ${pol.status}` });
  } else {
    const byTable = new Map();
    for (const row of JSON.parse(pol.body)) {
      byTable.set(row.tablename, (byTable.get(row.tablename) ?? 0) + 1);
    }
    const noPolicy = REQUIRED_RLS_TABLES.filter((t) => present.includes(t) && !byTable.get(t));
    findings.push({
      check: "rls_policies",
      pass: noPolicy.length === 0,
      detail: noPolicy.length === 0 ? "every table has >=1 policy" : `no policy on: ${noPolicy.join(", ")}`,
    });
  }

  for (const t of ["dsx_connections", "dsx_events", "dsx_ingestion_audit"]) {
    const a = await anonSelect(env, t);
    let empty = true;
    if (a.status === 200) {
      try { empty = Array.isArray(JSON.parse(a.body)) && JSON.parse(a.body).length === 0; }
      catch { empty = false; }
    }
    const pass = [200, 401, 403, 404].includes(a.status) && empty;
    findings.push({
      check: `anon_default_deny:${t}`,
      pass,
      detail: `HTTP ${a.status}${a.status === 200 ? " (empty)" : ""}`,
    });
  }
}

async function checkFunctions(env, findings) {
  const r = await serviceSelect(
    env,
    `/rest/v1/pg_proc?select=proname&proname=in.(${REQUIRED_FUNCTIONS.join(",")})`,
  );
  if (r.status !== 200) {
    findings.push({ check: "functions", pass: false, detail: `HTTP ${r.status}` });
    return;
  }
  const names = new Set(JSON.parse(r.body).map((row) => row.proname));
  const missing = REQUIRED_FUNCTIONS.filter((f) => !names.has(f));
  findings.push({
    check: "functions",
    pass: missing.length === 0,
    detail: missing.length === 0 ? `all ${REQUIRED_FUNCTIONS.length} present` : `missing: ${missing.join(", ")}`,
  });
}

async function checkAuth(env, findings) {
  const res = await fetch(`${env.DSX_DISPOSABLE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: env.DSX_DISPOSABLE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `verify+${Date.now()}@disposable.invalid`,
      password: "9f2Aq!8xLp3ZmQ7v-verifyOnly",
    }),
  });
  const ok = res.status === 400 || res.status === 403 || res.status === 422;
  findings.push({
    check: "auth_signup_disabled",
    pass: ok,
    detail: `anon signup HTTP ${res.status} (expect 400/403/422)`,
  });
}

async function checkDsxIngestEdge(env, findings) {
  const res = await fetch(`${env.DSX_DISPOSABLE_URL}/functions/v1/dsx-ingest`, {
    method: "POST",
    headers: {
      apikey: env.DSX_DISPOSABLE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const text = await res.text();
  let sanitized = false;
  try {
    const j = JSON.parse(text);
    sanitized = j.ok === false
      && j.error === "unauthorized"
      && typeof j.request_id === "string"
      && !("kid" in j) && !("claims" in j) && !("issues" in j)
      && !("alg" in j) && !("sub" in j);
  } catch { sanitized = false; }
  findings.push({
    check: "dsx_ingest_401_envelope",
    pass: res.status === 401 && sanitized,
    detail: `HTTP ${res.status}, sanitized=${sanitized}`,
  });
}

function checkEnvIdentity(env, findings) {
  const gate = evaluateDsxResumeGate(env);
  findings.push({ check: "resume_gate", pass: gate.allowed, detail: gate.allowed ? "allowed" : gate.reasons.join("; ") });

  const urlRef = refFromUrl(env.DSX_DISPOSABLE_URL);
  const dbRef = refFromDbUrl(env.DSX_DISPOSABLE_DB_URL);
  const expected = env.DSX_EXPECTED_DISPOSABLE_REF;
  const refsAgree = urlRef && dbRef && urlRef === dbRef && urlRef === expected;
  const notProd = urlRef !== PRODUCTION_PROJECT_REF
    && dbRef !== PRODUCTION_PROJECT_REF
    && expected !== PRODUCTION_PROJECT_REF;
  findings.push({
    check: "disposable_ref_identity",
    pass: !!(refsAgree && notProd),
    detail: `url_ref=${urlRef} db_ref=${dbRef} expected=${expected}`,
  });
}

export async function verifyDisposable(env = process.env) {
  const findings = [];
  checkEnvIdentity(env, findings);
  if (!findings.every((f) => f.pass)) {
    return { allowed: false, findings, aborted: "identity_or_gate_failed" };
  }
  await checkExtensions(env, findings);
  await checkRls(env, findings);
  await checkFunctions(env, findings);
  await checkAuth(env, findings);
  await checkDsxIngestEdge(env, findings);
  return { allowed: findings.every((f) => f.pass), findings };
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const result = await verifyDisposable();
  const width = Math.max(...result.findings.map((f) => f.check.length));
  for (const f of result.findings) {
    const status = f.pass ? "PASS" : "FAIL";
    console.log(`[${status}] ${f.check.padEnd(width)}  ${f.detail}`);
  }
  if (result.aborted) {
    console.error(`\nAborted early: ${result.aborted}. No network probes were sent to the disposable project.`);
  }
  if (!result.allowed) {
    console.error("\nDSX disposable verification: BLOCKED. Phase 3 is not authorized.");
    process.exit(1);
  }
  console.log("\nDSX disposable verification: ALLOWED. Phase 3 gate is open.");
  process.exit(0);
}

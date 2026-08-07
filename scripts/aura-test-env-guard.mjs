#!/usr/bin/env node
// AURA DC — mandatory disposable-environment guard.
//
// Blocks ANY migration replay, provisioning, or test mutation unless the
// resolved Supabase target is a disposable test project that is provably
// NOT the production project.
//
// Fails closed. Never prints credentials, connection strings, tokens or
// database passwords — only the resolved project reference.
//
// Usage:
//   node scripts/aura-test-env-guard.mjs            # CLI, exits 0/1
//   import { assertTestEnvAllowed } from "./aura-test-env-guard.mjs"

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const PRODUCTION_PROJECT_REF = "psfvrskpnwcshvajzeix";
export const EXPECTED_TEST_PROJECT_NAME = "aura-dc-security-test";
const AUDIT_LOG = "docs/evidence/phase-1/b0x-test-env-guard.log";

/** Hostnames that must never be contacted by a test runner. */
export const DENYLISTED_HOSTS = [
  `${PRODUCTION_PROJECT_REF}.supabase.co`,
  `${PRODUCTION_PROJECT_REF}.supabase.in`,
  "m2mdc.lovable.app",
  "auradc.m2mtechconnect.com",
  "m2mtechconnect.com",
];

/** True when the target string resolves to a denylisted production host. */
export function isDenylistedHost(target) {
  if (!target) return false;
  let host;
  try {
    host = new URL(target).hostname.toLowerCase();
  } catch {
    host = String(target).toLowerCase();
  }
  return DENYLISTED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Extract the project ref from a Supabase URL, or null. */
export function refFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const m = /^([a-z0-9-]+)\.supabase\.(co|in)$/i.exec(host);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function evaluateTestEnvGuard(env = process.env) {
  const reasons = [];
  const projectId = env.SUPABASE_PROJECT_ID?.trim() || null;
  const url = env.VITE_SUPABASE_URL?.trim() || null;
  const urlRef = refFromUrl(url);
  const marker = env.AURA_DC_TEST_ENV?.trim();

  // 1. Explicit test-environment marker required.
  if (marker !== EXPECTED_TEST_PROJECT_NAME) {
    reasons.push(
      `AURA_DC_TEST_ENV must be exactly "${EXPECTED_TEST_PROJECT_NAME}"`,
    );
  }

  // 2. Both identifiers must be present.
  if (!projectId) reasons.push("SUPABASE_PROJECT_ID is not configured");
  if (!url) reasons.push("VITE_SUPABASE_URL is not configured");
  if (url && !urlRef) {
    reasons.push("VITE_SUPABASE_URL is not a recognizable Supabase project URL");
  }

  // 3. Never production.
  if (projectId && projectId.includes(PRODUCTION_PROJECT_REF)) {
    reasons.push("SUPABASE_PROJECT_ID references the production project (forbidden)");
  }
  if (url && url.includes(PRODUCTION_PROJECT_REF)) {
    reasons.push("VITE_SUPABASE_URL references the production project (forbidden)");
  }

  // 4. Resolved ref must exactly equal SUPABASE_PROJECT_ID.
  if (projectId && urlRef && urlRef !== projectId) {
    reasons.push("resolved project reference does not equal SUPABASE_PROJECT_ID");
  }

  // 5. Publishable key required for auth probes; secret key is optional here
  //    and is NEVER used as proof of authenticated RLS.
  if (!env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    reasons.push("VITE_SUPABASE_PUBLISHABLE_KEY is not configured");
  }

  // 6. Target must be explicitly labelled disposable and cleanup authorized.
  if (env.AURA_DC_TEST_DISPOSABLE?.trim() !== "true") {
    reasons.push("AURA_DC_TEST_DISPOSABLE must be exactly \"true\" (target not labelled disposable)");
  }
  if (env.AURA_DC_TEST_CLEANUP_AUTHORIZED?.trim() !== "true") {
    reasons.push("AURA_DC_TEST_CLEANUP_AUTHORIZED must be exactly \"true\" (destructive cleanup not authorized)");
  }

  // 7. Production hostnames denylisted for the resolved target.
  if (url && isDenylistedHost(url)) {
    reasons.push("VITE_SUPABASE_URL resolves to a denylisted production hostname");
  }

  // 8. No production service-role key may be reachable by the test runner.
  //    Presence only is evaluated; the value is never read, compared or logged.
  if (env.SUPABASE_SERVICE_ROLE_KEY && projectId?.includes(PRODUCTION_PROJECT_REF)) {
    reasons.push("a service-role key is present while the target resolves to production (forbidden)");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    // Safe to print: a project reference is not a credential.
    targetRef: projectId ?? urlRef ?? null,
  };
}

export function recordGuardResult(result, exitCode) {
  const entry = {
    ts_utc: new Date().toISOString(),
    guard: "aura-test-env-guard",
    decision: result.allowed ? "allowed" : "blocked",
    target_ref: result.targetRef,
    reasons: result.reasons,
    exit_code: exitCode,
  };
  try {
    mkdirSync(dirname(AUDIT_LOG), { recursive: true });
    appendFileSync(AUDIT_LOG, `${JSON.stringify(entry)}\n`);
  } catch {
    /* audit failure must never mask the guard decision */
  }
  return entry;
}

export function assertTestEnvAllowed(env = process.env) {
  const result = evaluateTestEnvGuard(env);
  recordGuardResult(result, result.allowed ? 0 : 1);
  if (!result.allowed) {
    const err = new Error(`AURA test-env guard BLOCKED: ${result.reasons.join("; ")}`);
    err.code = "AURA_TEST_ENV_BLOCKED";
    err.reasons = result.reasons;
    throw err;
  }
  return result;
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const result = evaluateTestEnvGuard();
  const exitCode = result.allowed ? 0 : 1;
  recordGuardResult(result, exitCode);
  console.log(`AURA test-env guard: target reference = ${result.targetRef ?? "<unresolved>"}`);
  console.log(`AURA test-env guard: utc = ${new Date().toISOString()}`);
  if (!result.allowed) {
    console.error("AURA test-env guard: BLOCKED");
    for (const r of result.reasons) console.error(`  - ${r}`);
    console.error("\nNo migration replay, provisioning, or test mutation is authorized.");
    process.exit(1);
  }
  console.log("AURA test-env guard: ALLOWED (disposable test project confirmed)");
  process.exit(0);
}

#!/usr/bin/env node
// DSX resume gate.
//
// Blocks any DSX Phase 2 closure provisioning / verification action unless
// BOTH of the following are true:
//   1. DSX_DISPOSABLE_CONFIRMED === "1"
//   2. DSX_DISPOSABLE_PROJECT_REF === DSX_EXPECTED_DISPOSABLE_REF
//      AND the ref is NOT the production project ref.
//
// Fails closed. Never contacts any network. Never reads secrets beyond the
// declared env vars. Exits non-zero with a sanitized reason on any failure.
//
// Usage:
//   node scripts/dsx-resume-gate.mjs           # CLI check, exits 0/1
//   import { assertDsxResumeAllowed } from ... # programmatic guard

import { appendAuditEntry } from "./dsx-audit-log.mjs";

const PRODUCTION_PROJECT_REF = "psfvrskpnwcshvajzeix";

const REQUIRED_SECRETS = [
  "DSX_DISPOSABLE_PROJECT_REF",
  "DSX_DISPOSABLE_SERVICE_ROLE_KEY",
  "DSX_DISPOSABLE_DB_URL",
  "DSX_DISPOSABLE_ANON_KEY",
  "DSX_DISPOSABLE_URL",
  "DSX_DISPOSABLE_JWT_SECRET",
];

export function evaluateDsxResumeGate(env = process.env) {
  const reasons = [];

  if (env.DSX_DISPOSABLE_CONFIRMED !== "1") {
    reasons.push("DSX_DISPOSABLE_CONFIRMED is not set to \"1\"");
  }

  const expected = env.DSX_EXPECTED_DISPOSABLE_REF;
  const actual = env.DSX_DISPOSABLE_PROJECT_REF;

  if (!expected) {
    reasons.push("DSX_EXPECTED_DISPOSABLE_REF is not configured");
  }
  if (!actual) {
    reasons.push("DSX_DISPOSABLE_PROJECT_REF is not configured");
  }
  if (expected && actual && expected !== actual) {
    reasons.push("DSX_DISPOSABLE_PROJECT_REF does not match DSX_EXPECTED_DISPOSABLE_REF");
  }
  if (actual && actual === PRODUCTION_PROJECT_REF) {
    reasons.push("DSX_DISPOSABLE_PROJECT_REF equals the production project ref (forbidden)");
  }
  if (expected && expected === PRODUCTION_PROJECT_REF) {
    reasons.push("DSX_EXPECTED_DISPOSABLE_REF equals the production project ref (forbidden)");
  }

  const missing = REQUIRED_SECRETS.filter((k) => !env[k]);
  if (missing.length > 0) {
    reasons.push(`missing required disposable secrets: ${missing.join(", ")}`);
  }

  return { allowed: reasons.length === 0, reasons };
}

export function assertDsxResumeAllowed(env = process.env) {
  const result = evaluateDsxResumeGate(env);
  try {
    appendAuditEntry({
      kind: "resume_gate",
      action: "evaluated",
      decision: result.allowed ? "allowed" : "blocked",
      phase: "phase-2-closure",
      target_ref: env.DSX_DISPOSABLE_PROJECT_REF ?? null,
      detail: result.allowed
        ? "resume gate allowed disposable operations"
        : `resume gate blocked: ${result.reasons.join("; ")}`,
      context: { reasons: result.reasons },
    });
  } catch { /* audit failure must not mask gate decision */ }
  if (!result.allowed) {
    const err = new Error(
      `DSX resume gate BLOCKED: ${result.reasons.join("; ")}`,
    );
    err.code = "DSX_RESUME_BLOCKED";
    err.reasons = result.reasons;
    throw err;
  }
  return result;
}

// CLI entrypoint.
const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const result = evaluateDsxResumeGate();
  try {
    appendAuditEntry({
      kind: "resume_gate",
      action: "cli_invocation",
      decision: result.allowed ? "allowed" : "blocked",
      phase: "phase-2-closure",
      target_ref: process.env.DSX_DISPOSABLE_PROJECT_REF ?? null,
      detail: result.allowed ? "cli invocation allowed" : `cli invocation blocked: ${result.reasons.join("; ")}`,
      context: { reasons: result.reasons },
    });
  } catch { /* ignore */ }
  if (!result.allowed) {
    console.error("DSX resume gate: BLOCKED");
    for (const reason of result.reasons) console.error(`  - ${reason}`);
    console.error(
      "\nNo provisioning, migration replay, signed ingestion, or destructive SQL is authorized.",
    );
    process.exit(1);
  }
  console.log("DSX resume gate: ALLOWED (disposable environment confirmed)");
  process.exit(0);
}
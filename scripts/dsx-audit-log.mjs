#!/usr/bin/env node
// Append-only, hash-chained audit trail for every DSX decision and
// verification step. Entries are JSONL. Each entry embeds:
//   - ts:            ISO-8601 UTC timestamp
//   - seq:           monotonically increasing integer
//   - kind:          category ("resume_gate", "verify_check", "halt", ...)
//   - action:        short verb ("evaluated", "check", "abort", "pass")
//   - decision:      "allowed" | "blocked" | "info"
//   - target_ref:    disposable project ref (never production, redacted if it matches)
//   - phase:         optional phase / checkpoint tag
//   - detail:        sanitized human-readable string (secret values scrubbed)
//   - context:       sanitized JSON object (secret values scrubbed)
//   - prev_hash:     sha256 of previous entry's serialized line, or GENESIS
//   - entry_hash:    sha256 of this entry's canonical body + prev_hash
//
// Files never rewrite prior lines. Chain-break detection is provided by
// verifyAuditChain(). Reserved secret names are dropped before write.

import { createHash } from "node:crypto";
import { mkdirSync, appendFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PRODUCTION_PROJECT_REF = "psfvrskpnwcshvajzeix";

// Any env var whose name matches these is treated as a secret and its value
// is NEVER written to the audit log. Names of missing/failed secrets are
// still safe to record.
const SECRET_NAME_PATTERNS = [
  /_KEY$/i, /_SECRET$/i, /_TOKEN$/i, /_PASSWORD$/i, /_JWT$/i,
  /_JWKS/i, /_DB_URL$/i, /^PG(HOST|PASSWORD|USER|DATABASE|PORT)$/i,
  /SERVICE_ROLE/i, /ANON_KEY/i, /^LOVABLE_API_KEY$/i,
];

// Value-shape scrubbers: even if a value slips into `detail`/`context`,
// obvious JWTs, service-role keys, and DB URLs get masked.
const VALUE_SCRUBBERS = [
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, mask: "[REDACTED_JWT]" },
  { re: /postgres(?:ql)?:\/\/[^\s"']+/gi, mask: "[REDACTED_DB_URL]" },
  { re: /sk_(?:live|test)_[A-Za-z0-9]{16,}/g, mask: "[REDACTED_SK]" },
  { re: /Bearer\s+[A-Za-z0-9._-]{20,}/gi, mask: "Bearer [REDACTED]" },
];

const DEFAULT_LOG_PATH = resolve(
  process.env.DSX_AUDIT_LOG_PATH ??
    "docs/remediation/evidence/dsx-audit/audit.jsonl",
);

function isSecretName(name) {
  return SECRET_NAME_PATTERNS.some((re) => re.test(name));
}

function scrubString(s) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const { re, mask } of VALUE_SCRUBBERS) out = out.replace(re, mask);
  return out;
}

function scrubValue(v) {
  if (v == null) return v;
  if (typeof v === "string") return scrubString(v);
  if (Array.isArray(v)) return v.map(scrubValue);
  if (typeof v === "object") return scrubObject(v);
  return v;
}

function scrubObject(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (isSecretName(k)) { out[k] = "[REDACTED]"; continue; }
    out[k] = scrubValue(v);
  }
  return out;
}

function safeTargetRef(ref) {
  if (!ref) return null;
  if (ref === PRODUCTION_PROJECT_REF) return "[REDACTED_PRODUCTION_REF]";
  return String(ref);
}

function canonicalize(obj) {
  // Stable JSON: sort keys at every level.
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalize).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

function readLastLine(path) {
  if (!existsSync(path) || statSync(path).size === 0) return null;
  const buf = readFileSync(path, "utf8");
  const lines = buf.split("\n").filter((l) => l.length > 0);
  return lines[lines.length - 1] ?? null;
}

function nextSeqAndPrevHash(path) {
  const last = readLastLine(path);
  if (!last) return { seq: 1, prev_hash: "GENESIS" };
  try {
    const parsed = JSON.parse(last);
    return { seq: (parsed.seq ?? 0) + 1, prev_hash: parsed.entry_hash ?? "GENESIS" };
  } catch {
    // Corrupt tail — chain is broken. Refuse to append silently; caller
    // must repair the tail explicitly. Throw a typed error.
    const err = new Error("dsx-audit: corrupt trailing entry, refusing to append");
    err.code = "DSX_AUDIT_CORRUPT_TAIL";
    throw err;
  }
}

/**
 * Append a single audit entry. Returns the written entry (with hash).
 * Safe to call from any script; creates the log file/dir on first use.
 */
export function appendAuditEntry({
  kind,
  action,
  decision,
  target_ref = null,
  phase = null,
  detail = "",
  context = {},
  logPath = DEFAULT_LOG_PATH,
} = {}) {
  if (!kind || !action || !decision) {
    throw new Error("dsx-audit: kind, action, and decision are required");
  }
  if (!["allowed", "blocked", "info"].includes(decision)) {
    throw new Error(`dsx-audit: invalid decision "${decision}"`);
  }
  mkdirSync(dirname(logPath), { recursive: true });
  const { seq, prev_hash } = nextSeqAndPrevHash(logPath);
  const body = {
    ts: new Date().toISOString(),
    seq,
    kind: String(kind),
    action: String(action),
    decision,
    phase: phase == null ? null : String(phase),
    target_ref: safeTargetRef(target_ref),
    detail: scrubString(String(detail)),
    context: scrubObject(context ?? {}),
    prev_hash,
  };
  const entry_hash = sha256(canonicalize(body));
  const entry = { ...body, entry_hash };
  appendFileSync(logPath, JSON.stringify(entry) + "\n", { mode: 0o644 });
  return entry;
}

/**
 * Verify chain integrity. Returns { ok, entries, brokenAt? }.
 * Read-only.
 */
export function verifyAuditChain(logPath = DEFAULT_LOG_PATH) {
  if (!existsSync(logPath)) return { ok: true, entries: 0 };
  const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
  let prev = "GENESIS";
  let expectedSeq = 1;
  for (let i = 0; i < lines.length; i++) {
    let e;
    try { e = JSON.parse(lines[i]); }
    catch { return { ok: false, entries: i, brokenAt: i + 1, reason: "parse_error" }; }
    if (e.seq !== expectedSeq) return { ok: false, entries: i, brokenAt: i + 1, reason: "seq_gap" };
    if (e.prev_hash !== prev) return { ok: false, entries: i, brokenAt: i + 1, reason: "prev_hash_mismatch" };
    const { entry_hash, ...body } = e;
    if (sha256(canonicalize(body)) !== entry_hash) {
      return { ok: false, entries: i, brokenAt: i + 1, reason: "entry_hash_mismatch" };
    }
    prev = entry_hash;
    expectedSeq++;
  }
  return { ok: true, entries: lines.length };
}

// CLI: `node scripts/dsx-audit-log.mjs verify` or `... tail [N]`.
const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const [cmd = "verify", arg] = process.argv.slice(2);
  if (cmd === "verify") {
    const r = verifyAuditChain();
    console.log(JSON.stringify(r));
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === "tail") {
    const n = Math.max(1, parseInt(arg ?? "10", 10));
    if (!existsSync(DEFAULT_LOG_PATH)) { console.log("[]"); process.exit(0); }
    const lines = readFileSync(DEFAULT_LOG_PATH, "utf8").split("\n").filter(Boolean).slice(-n);
    for (const l of lines) console.log(l);
    process.exit(0);
  } else if (cmd === "summary") {
    // Machine-readable verification summary. Always exits 0 (unless the
    // log file itself cannot be read); consumers inspect `ok` in JSON.
    const r = verifyAuditChain();
    const summary = {
      schema: "dsx-audit-summary/v1",
      generated_at: new Date().toISOString(),
      log_path: DEFAULT_LOG_PATH,
      exists: existsSync(DEFAULT_LOG_PATH),
      ok: r.ok,
      entries: r.entries,
      broken_at: r.brokenAt ?? null,
      reason: r.reason ?? null,
      last_entry: null,
    };
    if (summary.exists && r.ok && r.entries > 0) {
      try {
        const last = JSON.parse(readLastLine(DEFAULT_LOG_PATH));
        summary.last_entry = {
          ts: last.ts,
          seq: last.seq,
          kind: last.kind,
          action: last.action,
          decision: last.decision,
          phase: last.phase,
          entry_hash: last.entry_hash,
        };
      } catch { /* leave last_entry null */ }
    }
    const outPath = arg;
    const payload = JSON.stringify(summary, null, 2);
    if (outPath) {
      mkdirSync(dirname(resolve(outPath)), { recursive: true });
      appendFileSync(resolve(outPath), ""); // ensure file exists
      // overwrite atomically-ish: truncate via writeFileSync
      // (import lazily to avoid touching top-level imports)
      // eslint-disable-next-line no-undef
      (globalThis.require ? globalThis.require("node:fs") : null);
    }
    if (outPath) {
      // use writeFileSync for a clean overwrite
      // (imported here to keep the diff local)
      import("node:fs").then(({ writeFileSync }) => {
        writeFileSync(resolve(outPath), payload + "\n", { mode: 0o644 });
        console.log(payload);
        process.exit(summary.ok ? 0 : 1);
      });
    } else {
      console.log(payload);
      process.exit(summary.ok ? 0 : 1);
    }
  } else {
    console.error("usage: dsx-audit-log.mjs [verify|tail N|summary [outPath]]");
    process.exit(2);
  }
}

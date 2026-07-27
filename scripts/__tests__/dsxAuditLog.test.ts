import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendAuditEntry, verifyAuditChain } from "../dsx-audit-log.mjs";

function tmpLog() {
  const dir = mkdtempSync(join(tmpdir(), "dsx-audit-"));
  return join(dir, "audit.jsonl");
}

describe("dsx audit log", () => {
  let logPath: string;
  beforeEach(() => { logPath = tmpLog(); });

  it("writes chained entries with monotonic seq and GENESIS prev_hash", () => {
    const a = appendAuditEntry({ kind: "resume_gate", action: "evaluated", decision: "blocked", detail: "no confirmation", logPath });
    const b = appendAuditEntry({ kind: "verify_check", action: "extensions", decision: "allowed", target_ref: "abc-disposable", logPath });
    expect(a.seq).toBe(1);
    expect(a.prev_hash).toBe("GENESIS");
    expect(b.seq).toBe(2);
    expect(b.prev_hash).toBe(a.entry_hash);
    const v = verifyAuditChain(logPath);
    expect(v).toEqual({ ok: true, entries: 2 });
  });

  it("redacts secret-shaped values and production ref", () => {
    const e = appendAuditEntry({
      kind: "resume_gate",
      action: "evaluated",
      decision: "blocked",
      target_ref: "psfvrskpnwcshvajzeix",
      detail: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payloadpartxxxxx.signaturepartxxxx used against postgres://user:pw@host/db",
      context: {
        DSX_DISPOSABLE_SERVICE_ROLE_KEY: "sk_live_ABCDEFGHIJKLMNOP1234",
        note: "ok",
      },
      logPath,
    });
    expect(e.target_ref).toBe("[REDACTED_PRODUCTION_REF]");
    expect(e.detail).not.toContain("eyJhbGci");
    expect(e.detail).toContain("[REDACTED_JWT]");
    expect(e.detail).toContain("[REDACTED_DB_URL]");
    expect(e.context.DSX_DISPOSABLE_SERVICE_ROLE_KEY).toBe("[REDACTED]");
    expect(e.context.note).toBe("ok");
  });

  it("detects tampering", () => {
    appendAuditEntry({ kind: "k", action: "a", decision: "info", logPath });
    appendAuditEntry({ kind: "k", action: "a", decision: "info", logPath });
    const raw = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
    const first = JSON.parse(raw[0]);
    first.detail = "tampered";
    writeFileSync(logPath, JSON.stringify(first) + "\n" + raw[1] + "\n");
    const v = verifyAuditChain(logPath);
    expect(v.ok).toBe(false);
    expect(v.brokenAt).toBe(1);
  });

  it("refuses to append when tail is corrupt", () => {
    appendAuditEntry({ kind: "k", action: "a", decision: "info", logPath });
    appendFileSync(logPath, "not-json\n");
    expect(() => appendAuditEntry({ kind: "k", action: "a", decision: "info", logPath })).toThrow(/corrupt/);
  });

  it("rejects invalid decision", () => {
    expect(() => appendAuditEntry({ kind: "k", action: "a", decision: "bogus" as any, logPath })).toThrow();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyDisposable } from "../dsx-disposable-verify.mjs";

const OK_REF = "disposable-xyz789";
const baseEnv = () => ({
  DSX_DISPOSABLE_CONFIRMED: "1",
  DSX_EXPECTED_DISPOSABLE_REF: OK_REF,
  DSX_DISPOSABLE_PROJECT_REF: OK_REF,
  DSX_DISPOSABLE_SERVICE_ROLE_KEY: "svc",
  DSX_DISPOSABLE_DB_URL: `postgres://postgres@db.${OK_REF}.supabase.co/postgres`,
  DSX_DISPOSABLE_ANON_KEY: "anon",
  DSX_DISPOSABLE_URL: `https://${OK_REF}.supabase.co`,
  DSX_DISPOSABLE_JWT_SECRET: "jwt",
});

describe("verifyDisposable", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("aborts early with no network calls when gate fails", async () => {
    const r = await verifyDisposable({});
    expect(r.allowed).toBe(false);
    expect(r.aborted).toBe("identity_or_gate_failed");
    expect((globalThis.fetch as any).mock.calls.length).toBe(0);
  });

  it("aborts when ref equals production project", async () => {
    const env = { ...baseEnv(),
      DSX_EXPECTED_DISPOSABLE_REF: "psfvrskpnwcshvajzeix",
      DSX_DISPOSABLE_PROJECT_REF: "psfvrskpnwcshvajzeix",
      DSX_DISPOSABLE_URL: "https://psfvrskpnwcshvajzeix.supabase.co",
      DSX_DISPOSABLE_DB_URL: "postgres://x@db.psfvrskpnwcshvajzeix.supabase.co/postgres",
    };
    const r = await verifyDisposable(env);
    expect(r.allowed).toBe(false);
    expect((globalThis.fetch as any).mock.calls.length).toBe(0);
  });

  it("passes all checks with mocked healthy disposable env", async () => {
    (globalThis.fetch as any).mockImplementation(async (url: string) => {
      const u = String(url);
      const json = (body: unknown, status = 200) => ({
        status, text: async () => JSON.stringify(body),
      });
      if (u.includes("/rest/v1/pg_extension"))
        return json(["pgcrypto","pgsodium","supabase_vault","pg_graphql","pg_cron","vector"].map((extname) => ({ extname })));
      if (u.includes("/rest/v1/pg_tables"))
        return json(["dsx_connections","dsx_asset_mappings","dsx_events","dsx_events_quarantine","dsx_gateway_heartbeats","dsx_ingestion_audit","profiles","user_roles"].map((tablename) => ({ tablename })));
      if (u.includes("/rest/v1/pg_policies"))
        return json(["dsx_connections","dsx_asset_mappings","dsx_events","dsx_events_quarantine","dsx_gateway_heartbeats","dsx_ingestion_audit","profiles","user_roles"].map((tablename) => ({ tablename, policyname: "p" })));
      if (u.includes("/rest/v1/pg_proc"))
        return json(["has_role","is_approved_user","dsx_current_user_in_org","dsx_current_user_is_operator_in_org","dsx_ingest_event","admin_assign_role","admin_revoke_role"].map((proname) => ({ proname })));
      if (u.includes("/rest/v1/dsx_")) return json([]);
      if (u.includes("/auth/v1/signup")) return json({ msg: "disabled" }, 422);
      if (u.includes("/functions/v1/dsx-ingest"))
        return { status: 401, text: async () => JSON.stringify({ ok: false, error: "unauthorized", request_id: "req_1" }) };
      throw new Error(`unmocked ${u}`);
    });
    const r = await verifyDisposable(baseEnv());
    const failed = r.findings.filter((f: any) => !f.pass);
    expect(failed, JSON.stringify(failed)).toEqual([]);
    expect(r.allowed).toBe(true);
  });

  it("fails when dsx-ingest leaks kid/claims", async () => {
    (globalThis.fetch as any).mockImplementation(async (url: string) => {
      const json = (body: unknown, status = 200) => ({ status, text: async () => JSON.stringify(body) });
      const u = String(url);
      if (u.includes("/rest/v1/pg_extension"))
        return json(["pgcrypto","pgsodium","supabase_vault","pg_graphql","pg_cron","vector"].map((extname) => ({ extname })));
      if (u.includes("/rest/v1/pg_tables"))
        return json(["dsx_connections","dsx_asset_mappings","dsx_events","dsx_events_quarantine","dsx_gateway_heartbeats","dsx_ingestion_audit","profiles","user_roles"].map((tablename) => ({ tablename })));
      if (u.includes("/rest/v1/pg_policies"))
        return json(["dsx_connections","dsx_asset_mappings","dsx_events","dsx_events_quarantine","dsx_gateway_heartbeats","dsx_ingestion_audit","profiles","user_roles"].map((tablename) => ({ tablename, policyname: "p" })));
      if (u.includes("/rest/v1/pg_proc"))
        return json(["has_role","is_approved_user","dsx_current_user_in_org","dsx_current_user_is_operator_in_org","dsx_ingest_event","admin_assign_role","admin_revoke_role"].map((proname) => ({ proname })));
      if (u.includes("/rest/v1/dsx_")) return json([]);
      if (u.includes("/auth/v1/signup")) return json({}, 422);
      if (u.includes("/functions/v1/dsx-ingest"))
        return { status: 401, text: async () => JSON.stringify({ ok: false, error: "unauthorized", request_id: "r", kid: "leaked" }) };
      throw new Error(u);
    });
    const r = await verifyDisposable(baseEnv());
    expect(r.allowed).toBe(false);
    expect(r.findings.find((f: any) => f.check === "dsx_ingest_401_envelope")?.pass).toBe(false);
  });
});

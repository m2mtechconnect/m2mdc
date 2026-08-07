import { describe, it, expect } from "vitest";
import { evaluateTestEnvGuard, refFromUrl } from "../aura-test-env-guard.mjs";

const REF = "auradisposable123";
const ok = () => ({
  AURA_DC_TEST_ENV: "aura-dc-security-test",
  SUPABASE_PROJECT_ID: REF,
  VITE_SUPABASE_URL: `https://${REF}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: "pub",
});

describe("aura test-env guard", () => {
  it("allows a well-formed disposable environment", () => {
    const r = evaluateTestEnvGuard(ok());
    expect(r.reasons).toEqual([]);
    expect(r.allowed).toBe(true);
    expect(r.targetRef).toBe(REF);
  });

  it("blocks when the test-environment marker is missing", () => {
    const env = { ...ok() };
    delete (env as Record<string, string>).AURA_DC_TEST_ENV;
    expect(evaluateTestEnvGuard(env).allowed).toBe(false);
  });

  it("blocks the production project ref", () => {
    const r = evaluateTestEnvGuard({
      ...ok(),
      SUPABASE_PROJECT_ID: "psfvrskpnwcshvajzeix",
      VITE_SUPABASE_URL: "https://psfvrskpnwcshvajzeix.supabase.co",
    });
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toContain("production project");
  });

  it("blocks when url ref does not equal SUPABASE_PROJECT_ID", () => {
    const r = evaluateTestEnvGuard({ ...ok(), SUPABASE_PROJECT_ID: "otherref999" });
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toContain("does not equal");
  });

  it("blocks when the publishable key is absent", () => {
    const env = { ...ok() };
    delete (env as Record<string, string>).VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(evaluateTestEnvGuard(env).allowed).toBe(false);
  });

  it("never surfaces credentials in the result", () => {
    const r = evaluateTestEnvGuard({ ...ok(), SUPABASE_DB_PASSWORD: "hunter2" });
    expect(JSON.stringify(r)).not.toContain("hunter2");
  });

  it("parses refs from supabase urls only", () => {
    expect(refFromUrl(`https://${REF}.supabase.co`)).toBe(REF);
    expect(refFromUrl("https://evil.example.com")).toBeNull();
    expect(refFromUrl(undefined)).toBeNull();
  });
});

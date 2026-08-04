import { describe, it, expect } from "vitest";
import { evaluateDsxResumeGate } from "../dsx-resume-gate.mjs";

const PROD = "psfvrskpnwcshvajzeix";
const OK_REF = "disposable-abc123";

const fullSecrets = (ref: string) => ({
  DSX_DISPOSABLE_CONFIRMED: "1",
  DSX_EXPECTED_DISPOSABLE_REF: ref,
  DSX_DISPOSABLE_PROJECT_REF: ref,
  DSX_DISPOSABLE_SERVICE_ROLE_KEY: "x",
  DSX_DISPOSABLE_DB_URL: "postgres://x",
  DSX_DISPOSABLE_ANON_KEY: "x",
  DSX_DISPOSABLE_URL: "https://x",
});

describe("DSX resume gate", () => {
  it("allows when confirmed and refs match a disposable project", () => {
    const r = evaluateDsxResumeGate(fullSecrets(OK_REF));
    expect(r.allowed).toBe(true);
  });

  it("blocks without DSX_DISPOSABLE_CONFIRMED=1", () => {
    const env = { ...fullSecrets(OK_REF), DSX_DISPOSABLE_CONFIRMED: "0" };
    expect(evaluateDsxResumeGate(env).allowed).toBe(false);
  });

  it("blocks when project ref does not match expected", () => {
    const env = { ...fullSecrets(OK_REF), DSX_DISPOSABLE_PROJECT_REF: "other" };
    expect(evaluateDsxResumeGate(env).allowed).toBe(false);
  });

  it("blocks when ref equals the production project", () => {
    expect(evaluateDsxResumeGate(fullSecrets(PROD)).allowed).toBe(false);
  });

  it("blocks when required secrets are missing", () => {
    const env: Record<string, string> = fullSecrets(OK_REF);
    delete env.DSX_DISPOSABLE_DB_URL;
    const r = evaluateDsxResumeGate(env);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/DSX_DISPOSABLE_DB_URL/);
  });

  it("blocks empty environment", () => {
    expect(evaluateDsxResumeGate({}).allowed).toBe(false);
  });

  it("does not require the legacy project JWT secret", () => {
    const env: Record<string, string> = fullSecrets(OK_REF);
    delete (env as Record<string, string>).DSX_DISPOSABLE_JWT_SECRET;
    const r = evaluateDsxResumeGate(env);
    expect(r.allowed).toBe(true);
    expect(r.reasons.join(" ")).not.toMatch(/JWT_SECRET/);
  });
});
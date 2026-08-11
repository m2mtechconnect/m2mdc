# AURA DC - Independent Full-Stack Technical Audit

- Audit window (UTC): 2026-08-11T14:35:22Z to 2026-08-11T14:43:48Z
- Auditor mode: read-only. No application code, schema, permission, infrastructure or external service was modified. Only these audit documents were written.
- Target: production project ref `psfvrskpnwcshvajzeix` (read-only probes only).
- Method: static inspection (157 edge functions, ~120 public tables, 35+ migrations), local typecheck/lint/test/build execution, Playwright runtime route probes (authenticated + anonymous), and read-only REST probes against the live Data API.

## Verdict

**NO-GO for production pilot. Readiness: 52 / 100 (PROVISIONAL).**

The security and provenance *foundations* are strong and, in the newer subsystems, genuinely
exemplary. The blockers are (a) a red core test suite, (b) large legacy UI surfaces that render
fabricated operational data with no provenance labelling, and (c) unauthenticated
defense-in-depth gaps on service-role edge functions.

## Documents

| File | Contents |
|---|---|
| `findings.md` | Prioritised findings register (P0-P3) with evidence and remediation |
| `evidence.md` | Raw command output, probe results and counts |
| `scorecard.md` | Production readiness scoring by domain |

## Scope limitations (declared, not hidden)

1. **No migration replay.** `scripts/aura-test-env-guard.mjs` correctly denied the production ref;
   no disposable Supabase environment was authorised. All schema/RLS conclusions are **static**
   unless explicitly marked as runtime-probed.
2. **Single identity available.** The injected browser session belongs to an `admin` user.
   Non-admin and cross-tenant RLS behaviour is **UNVERIFIED** at runtime.
3. **No mutations executed.** Write-path RLS (INSERT/UPDATE/DELETE policies, role-grant RPCs,
   audit triggers) is verified from SQL only.
4. **Edge functions not invoked.** Reachability and `verify_jwt` behaviour is inferred from
   `supabase/config.toml` plus source, not from live requests.
5. Sub-audits were produced by parallel analysis agents; every finding cited below was
   independently spot-checked against the file and line referenced.
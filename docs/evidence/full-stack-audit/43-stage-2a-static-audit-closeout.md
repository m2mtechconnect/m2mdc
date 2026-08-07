# Stage 2A - Static Audit Closeout (2026-08-07)

Audit-only stage. No application code, migration, schema, B-04 artefact, Supabase configuration, secret or
production row was modified. No runtime traffic was sent to any project.

## 1. F-01 arithmetic reconciled

All **49** core tables now sit in exactly one of three mutually exclusive categories (49/49, no double counting):

| Ownership-path class | Count |
|---|---|
| `authoritative_tenant_path` | 16 |
| `user_only_path` | 28 |
| `no_authoritative_ownership_path` | 5 |

`37-f01-core-ownership-path-reconciliation.csv` records, per table: resource type, direct tenant column,
parent tenant path, user ownership path, authoritative source, cross-tenant relationship prevention, RLS summary.

The decisive fact: **`data_centre_twins`, the root of the twin graph, is `user_only_path`** - scoped by
`created_by_user`, with no `org_id` and no foreign key to `organizations`. Every twin child table (telemetry,
KPI snapshots, carbon, financial records, sovereignty events, simulation runs) inherits from that user-only root.
A tenant cannot be expressed for the product's central resource, so **F-01 remains CRITICAL**.

Even where a parent tenant path exists, no database constraint forbids a foreign key that crosses tenants; that
is probe R-11.

## 2. F-13 re-proved and decomposed

All 156 functions carry exactly one effective-access class:

| Class | Count |
|---|---|
| `authenticated_only` | 76 |
| `unprotected_reachable` | 39 |
| `unknown` | 17 |
| `intentionally_public` | 16 |
| `authenticated_and_authorized` | 7 |
| `signed_webhook` | 1 |

- `signed_webhook` is `dsx-ingest` alone. It sets `verify_jwt = false` deliberately and performs mandatory in-code
  verification of the gateway token (algorithm pin, signature, `iss`/`aud`/`sub`/`exp`/`iat`/skew, connection
  status, subject allowlist) before any state read. This is **not** an unprotected function.
- `unknown` (17) means the gateway default could not be established statically. Probe **R-20** resolves the whole
  class with a single unauthenticated call.
- `unprotected_reachable` (39) is the real finding, and its dominant cause is structural, not per-function:
  `_shared/auth.ts` implements `authLevel: "admin"` as *"return a service-role client"* with **no token
  verification and no role lookup**. That is now **F-15 (HIGH)**. `teams-invite` is in this class because it
  verifies the caller's identity but then inserts through the service-role key with no admin predicate.

**Corrected wording:** the accurate statement is *"79 functions perform no in-code authorization check"*, not
"79 functions are unauthenticated". The residual control for most of them is the platform gateway plus RLS - and
RLS is void wherever the service-role key is used (33 functions).

## 3. Migration analysis corrected

All **106** `CREATE TABLE without GRANT` findings are reclassified **false_positive** (`39-migration-grant-reassessment.csv`).
Effective privileges were read from the live catalog: `authenticated` holds an explicit ACL entry on **117 of 118**
public relations and `service_role` on **118**, supplied by project-level `ALTER DEFAULT PRIVILEGES` that lives
outside the repository migration set. The absent in-migration `GRANT` never produced an absent privilege.

Residual, genuine items: `mv_ops_overview` has no `authenticated` grant; 5 `USING (true)` policies and 1 in-file
`SECURITY DEFINER` without `search_path` remain tracked (the live catalog shows all 33 SECDEF functions pin
`search_path`, so the last one is an authoring defect, not a runtime defect). Stage 1 gate 9 is downgraded from
FAIL to **PASS with hygiene notes** and recorded as **F-17 (INFORMATIONAL)**.

## 4. F-14 investigated

32 declared cases across 3 files never execute. All three fail at **transform time, before any `describe()` runs** -
none is a conditional skip, none is excluded by configuration:

| File | Cases | Cause |
|---|---|---|
| `tests/integration/builder-flow.test.ts` | 10 | contains JSX but uses the `.ts` extension; the SWC transform rejects it |
| `tests/integration/template-validation.test.ts` | 10 | imports `@jest/globals`; no Jest runner and no such package |
| `tests/unit/templateLoader.test.ts` | 12 | imports `@jest/globals`; no Jest runner and no such package |

Most significant: `templateLoader.test.ts` is the **only** automated guard on the "Data Centre is the exclusive
master template" invariant, and it has never executed. Details in `40-f14-zero-collection-suites.csv`.

## 5. Hermetic gates normalized

`44-normalized-hermetic-gate-results.md` reports every gate as measured value vs threshold, including the lint
rule breakdown (93.4% is `no-explicit-any`; **no** correctness or injection rule fires in a security path), the
per-chunk bundle table with Brotli sizes and the code-splitting evidence (only 6 `React.lazy` sites, which is why
`AuthenticatedShell` reaches 2,093 kB), the dead-code reclassification (**56 proven-unreachable**, not 287 - the
287 figure is withdrawn), the test attribution table with the 7 unattributed collected tests stated as such, and
the dependency scan recorded as **BLOCKED, not PASS**, with an SBOM of 901 resolved packages and the three-lockfile
provenance.

## 6. Runtime manifest prepared, not executed

`42-blocked-runtime-execution-manifest.md` defines 9 personas and 26 probes (R-01..R-26) with expected results,
fixtures, cleanup and named evidence artefacts, all gated behind `npm run guard:test-env`. No disposable-project
variables are requested at this stage.

## 7. Final static position

| Severity | Count | Findings |
|---|---|---|
| CRITICAL | 1 | F-01 |
| HIGH | 7 | F-03, F-05, F-07, F-08, F-10, F-13, F-15 |
| MEDIUM | 5 | F-02, F-06, F-09, F-14, F-16 |
| INFORMATIONAL | 4 | F-04, F-11, F-12, F-17 |

Readiness: **42% PROVISIONAL**. Verdict: **Production NO-GO**.

The static audit is closed. Everything that remains requires the disposable environment.

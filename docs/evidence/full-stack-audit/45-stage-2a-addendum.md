# Stage 2A Addendum (2026-08-07)

Audit-only. No application code, migration, schema, B-04 artefact, Supabase configuration, secret or
production row was modified. The only production traffic was read-only catalog introspection
(`pg_class`, `pg_proc`, `has_*_privilege`, `storage.buckets`). No integration-test traffic was sent.

## 1. Edge Function count reconciled

`supabase/functions/` contains **157 directories**. One of them, `_shared/`, has **no `index.ts`** and is a
shared-library directory, not a deployable function. It was counted in the Stage 1 baseline inventory and
correctly excluded from Stage 2A classification.

| Measure | Value |
|---|---|
| Directories under `supabase/functions/` | 157 |
| Directories containing `index.ts` | 156 |
| Non-deployable library directories | 1 (`_shared/`) |
| **Deployable Edge Functions** | **156** |

The discrepancy is fully explained; there is no missing function. The 156 classified in
`38-f13-edge-function-effective-access.csv` is the correct and complete deployable inventory.

## 2. F-15 refined and split

`_shared/auth.ts` `authLevel: "admin"` returns a **service-role client with no token verification, no role
lookup, and no tenant predicate**. Static evidence (`46-f15-shared-auth-function-matrix.csv`) shows
**8 functions** declare `authLevel: "admin"`; a 9th (`integrations-list`) imports `_shared/auth.ts` directly at
`"user"` level and is correctly authorized.

Deployed gateway posture: `supabase/config.toml` overrides `verify_jwt` for exactly two functions
(`green-dc-recommend = true`, `dsx-ingest = false`). Every `admin`-level function therefore inherits the
platform default **`verify_jwt = true`**. Accordingly **none of them is classified
`anonymous_unprotected`** - a bearer token is required to reach them.

| Effective caller class | Count |
|---|---|
| `authenticated_without_admin_authorization` | 8 |
| `authenticated_and_authorized` | 1 (`integrations-list`) |
| `anonymous_unprotected` | 0 |

**Anonymous privileged endpoints: 0. Authenticated non-admin privileged endpoints: 8.**

F-15 is split into child findings:

| ID | Scope | Class | Severity | Basis |
|---|---|---|---|---|
| F-15a | `_shared/auth.ts` `admin` level: no identity, role or tenant check before creating the service-role client | structural | HIGH | the privileged client is constructed before any authorization decision, so RLS is void for every consumer |
| F-15b | `ops-heartbeat` | authenticated_without_admin_authorization | **CRITICAL** | accepts a caller-supplied `agent_id` and performs a service-role `UPDATE public.agents` plus `INSERT public.heartbeats`. Any authenticated user can write to any tenant's agent row. |
| F-15c | `zapier-webhook` | authenticated_without_admin_authorization | **CRITICAL** | caller-controlled `app_key` path segment selects an integration; service-role `UPDATE public.integrations` and `INSERT public.integration_logs` follow. Signature verification is a `TODO` and is skipped when the header is absent. |
| F-15d | `analytics-export`, `analytics-overview`, `analytics-systems`, `ai-systems`, `ops-overview`, `ops-systems` | authenticated_without_admin_authorization | HIGH | service-role **reads** across `agents`, `roi_snapshots`, `agent_runs`, `agent_conversations`, `environments`, `system_health` with no owner or tenant predicate; `analytics-export` renders the whole set to a downloadable file. |

**F-15 final severity: CRITICAL** (driven by F-15b and F-15c: authenticated, non-admin, cross-tenant writes
executed with the service-role key).

The invariant this violates: because service-role execution bypasses RLS, tenant isolation must be enforced
**before** the privileged client is created. In `_shared/auth.ts` it is enforced nowhere.

Runtime probes R-20 through R-25 are prepared and remain **blocked** - no live confirmation was attempted.

## 3. F-17 corrected

The Stage 2A "all 106 are false positives" wording is **withdrawn**. Presence of a grant in the production
catalog does not make an absent migration GRANT a false positive; it makes the migration set dependent on
platform state. Reclassification in `47-f17-migration-grant-reclassification.csv`:

| Classification | Count |
|---|---|
| `platform_managed_privilege` (secondary: `migration_nonhermetic`) | 102 |
| `resolved_by_explicit_later_grant` (secondary: `migration_nonhermetic`) | 4 |
| `resolved_by_documented_default_privilege` | 0 |
| `intentional_no_grant` | 0 |
| `excessive_effective_privilege` | 0 |
| `unknown` | 0 |

The 4 relations that a later in-repo migration grants explicitly: `dc_blueprint_templates`,
`onboarding_submissions`, `profiles`, `user_roles`. The other 102 receive their privilege solely from the
Supabase bootstrap `ALTER DEFAULT PRIVILEGES IN SCHEMA public`, which lives outside the repository. A clean
replay into an empty non-Supabase Postgres would produce **no** privilege for those 102 relations. That is a
real defect of the migration set (`migration_nonhermetic`), and it is exactly what probe **R-01 (clean
migration replay)** exists to measure.

Effective privileges by object class are reported separately in
`50-effective-privilege-by-object-class.csv`: relations, functions/RPCs, sequences, schemas, storage.

**Why `authenticated` has privileges on 117 of 118 relations.** The bootstrap default-privilege rule applies to
tables and views created by the migration owner; the one relation it does not reach is the materialized view
**`mv_ops_overview`** (`relkind = 'm'`, `relacl = {postgres, service_role, sandbox_exec*}`). Materialized views
are not covered by `ALTER DEFAULT PRIVILEGES ... ON TABLES`, and no migration granted it. `mv_ops_overview` is
therefore service-role only and unreadable by `authenticated` through PostgREST.

RLS coverage and effective policy behaviour remain separate evidence
(`11-database-security-audit.md`, `24-f02-update-policy-effective-check-matrix.csv`). A grant is not a policy
and a policy is not a grant.

## 4. F-14 closed precisely

**The exact uncollected total is 32, not 30.** The earlier 30 undercounted `templateLoader.test.ts`
(12 cases, not 10). Full case identities - file, describe path, case name, failure stage - are preserved in
`48-f14-uncollected-case-identities.csv` (32 rows).

| File | Cases | Failure stage |
|---|---|---|
| `tests/integration/builder-flow.test.ts` | 10 | JSX in a `.ts` file, rejected by `vite:react-swc` at transform |
| `tests/integration/template-validation.test.ts` | 10 | unresolved import `@jest/globals` at transform |
| `tests/unit/templateLoader.test.ts` | **12** | unresolved import `@jest/globals` at transform |

**Unexecuted invariant coverage.** `tests/unit/templateLoader.test.ts` is the only automated guard on the
core product invariant *"Data Centre is the exclusive master template"*. The specific never-executed
assertions are: `loadAllTemplates` returns exactly 1 template (Data Centre Master); the template has a valid
schema and all required fields; `loadTemplateById` resolves the Data Centre template and returns `null` for an
unknown id; RAG, LLM, workflow and metrics-default configuration validation; and the Data Centre specific
checks for 9 domain twins, simulation scenarios and DC KPIs.

That invariant is recorded as **UNVERIFIED**. Nothing in this audit permits the inference that it holds in
production. F-14 remains MEDIUM as a test-integrity finding; the invariant status is separately open.

## 5. Static package frozen

Artefacts added: `45`, `46`, `47`, `48`, `50`. Updated: `20-findings-register.csv`,
`21-production-readiness-scorecard.md`, `SHA256SUMS`. Stage 2B evidence: `49-stage-2b-preflight.md`.

| Severity | Count | Findings |
|---|---|---|
| CRITICAL | 2 | F-01, F-15 (children F-15b, F-15c) |
| HIGH | 7 | F-03, F-05, F-07, F-08, F-10, F-13, F-15a/F-15d |
| MEDIUM | 6 | F-02, F-06, F-09, F-14, F-16, F-17 |
| INFORMATIONAL | 3 | F-04, F-11, F-12 |

F-17 moves from INFORMATIONAL to MEDIUM (non-hermetic migration set, gated on R-01).

Readiness: **40% PROVISIONAL** (down from 42% - F-15 escalation to CRITICAL and F-17 re-rating).
Verdict: **Production NO-GO**.

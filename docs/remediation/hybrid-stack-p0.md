# AURA DC Hybrid Stack P0 Security Remediation

## Scope and repository baseline

This remediation was reproduced from `main` commit
`82fdb333ec70face80b4dc0a774b8ed6ed553959` before any branch changes. The
work is isolated on `remediation/hybrid-stack-p0`; it does not modify `main`,
production data, migrations, or deployed services.

The verified starting baseline was:

| Gate | Starting result |
| --- | --- |
| TypeScript | Passed with zero type errors |
| Tests | 1,908 passed, 81 skipped, 0 failed; 695 suites |
| ESLint | 0 errors, 1,167 warnings |
| Production build | Passed; circular chunk warnings and a 1,844.96 kB main JavaScript chunk |

The package manager is Bun (`bun.lock`, verified with Bun 1.3.14). The
migration head remains
`20260819135011_f33bf641-5944-4776-8481-868bc33b0296.sql`; this remediation
adds no migration.

## Original defects and threat model

### Administrative service-role boundary

`getAuthContext(req, "admin")` in
`supabase/functions/_shared/auth.ts` created a Supabase service-role client
without first requiring a bearer token, validating the caller, resolving an
administrative role, or establishing tenant membership. Gateway JWT checking
was not a sufficient authorization boundary. A caller reaching an affected
function could therefore execute service-role-backed queries without an
in-code proof of administrative authority, and those queries were not
consistently tenant-scoped.

The affected `createHandler` callers were:

| Function | Affected operation |
| --- | --- |
| `analytics-overview` | Service-role analytics aggregation |
| `analytics-export` | Service-role analytics export |
| `analytics-systems` | Service-role system analytics |
| `ai-systems` | Service-role AI system listing |
| `ops-heartbeat` | Service-role heartbeat lookup and update |
| `ops-overview` | Service-role operations aggregation |
| `ops-systems` | Service-role operations system listing |

Threats included unauthenticated access, an ordinary user inheriting
service-role authority, expired or invalid credentials being accepted,
cross-tenant data disclosure, ambiguous tenant selection, and fail-open
behavior during role or membership lookup failures.

### Shared CORS policy

`supabase/functions/_shared/handler.ts` emitted
`Access-Control-Allow-Origin: *` on preflight, authentication failure,
validation failure, success, and unexpected-error responses. It was imported
by 77 Edge Function entrypoints. `supabase/functions/_shared/cors.ts` also had
wildcard development behavior, hard-coded fallback behavior, and selected a
fallback allowed origin when the request origin was missing or denied.

`src/test/edgeFunctionCors.test.ts` scanned only function `index.ts` files, so
it did not detect wildcard behavior in `_shared` helpers or response
factories. The resulting threats were unauthorized browser origins receiving
broad cross-origin grants, inconsistent policy across error paths, arbitrary
origin reflection, and regressions hidden from the source guard.

## Code changes

### Fail-closed administrator authorization

- Added `supabase/functions/_shared/adminAuthorization.ts` as a testable,
  fail-closed authorization boundary.
- Updated `supabase/functions/_shared/auth.ts` to require a strict bearer
  token, validate it with Supabase Auth, and use the caller's RLS-bound client
  for authorization lookups.
- Reused the repository's canonical administrative roles:
  `security_admin`, `admin`, and `owner`.
- Required one canonical `profiles.org_id` membership and a matching,
  visible `organizations` row. A supplied `X-Organization-Id` must match that
  canonical organization.
- Deferred creation of the service-role client until authentication, active
  administrative-role resolution, and tenant validation all succeed.
- Added structured authorization outcomes containing only decision metadata,
  user ID, organization ID, and role. Tokens and secrets are not logged.
- Retained the authenticated user, user ID, organization ID, tenant ID, and
  roles in the shared handler context.
- Scoped every affected analytics, operations, export, and AI-system query by
  canonical organization and denied requested systems outside that scope.
- Added explicit `verify_jwt = true` entries for all seven affected functions
  in `supabase/config.toml`.
- Added executable negative and positive authorization tests in
  `src/test/edgeAdminAuthorization.test.ts` and caller/config guards in
  `src/test/adminEdgeTenantScope.test.ts`.

The boundary returns `401` for missing, invalid, or expired authentication;
`403` for authenticated callers without an allowed role or valid tenant
context; and a fail-closed server error for backend authorization lookup
failures. The service-role factory is never invoked before successful
authorization.

### Fail-closed shared CORS

- Replaced wildcard and fallback behavior in
  `supabase/functions/_shared/cors.ts` with the environment-controlled,
  comma-separated `CORS_ALLOWED_ORIGINS` allowlist.
- Normalized and accepted only canonical HTTP(S) origins and echoed only an
  exact allowlist match.
- Added `Vary: Origin` to every policy decision. Credentials are emitted only
  for an allowed exact origin and are never combined with a wildcard.
- Denied missing, malformed, or unlisted preflight origins with `403`.
- Kept originless non-browser requests possible without emitting an
  `Access-Control-Allow-Origin` grant.
- Limited built-in localhost exceptions to explicit
  `ENVIRONMENT=development` mode.
- Added one shared JSON response factory and routed preflight,
  authentication-error, validation-error, success, and unexpected-error
  responses in `supabase/functions/_shared/handler.ts` through the same
  policy.
- Documented the required variable in `.env.example` without adding a live
  credential.
- Extended `src/test/edgeFunctionCors.test.ts` to scan all 163 Edge Function
  entrypoints, `_shared/**`, and practical literal/computed wildcard forms.
- Added response-level coverage in
  `src/test/edgeFunctionCorsResponses.test.ts`.

## Test matrix

| Boundary | Case | Expected result | Evidence |
| --- | --- | --- | --- |
| Admin auth | Missing bearer header | `401`; no service client | Targeted test passes |
| Admin auth | Invalid or expired token | `401`; no service client | Targeted tests pass |
| Admin auth | Authenticated non-admin | `403`; no service client | Targeted test passes |
| Admin auth | Admin in wrong tenant | `403`; no service client | Targeted test passes |
| Admin auth | Missing/ambiguous role or tenant | Fail closed; no service client | Targeted tests pass |
| Admin auth | Database lookup failure | Server error; no service client | Targeted test passes |
| Admin auth | Authorized tenant admin | Authorized context and service client | Targeted test passes |
| CORS | Exact allowed production origin | Exact origin, credentials, and `Vary` | Response test passes |
| CORS | Denied/lookalike/malformed origin | No origin or credential grant | Response tests pass |
| CORS | Missing preflight origin | `403`, no origin grant | Response test passes |
| CORS | Allowed preflight | `204` with exact origin and `Vary` | Response test passes |
| CORS | Auth, validation, success, error | Identical origin policy | Response tests pass |
| CORS | Localhost | Allowed only in explicit development | Response test passes |
| CORS guard | Entrypoints and shared helpers | No wildcard CORS source | Source guard passes |

## Verification commands and outcomes

The test commands used local non-production Supabase placeholders and
`USE_MOCK_LLM=true`; no production data was accessed.

```sh
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
```

Passed with zero type errors.

```sh
./node_modules/.bin/vitest run \
  src/test/edgeAdminAuthorization.test.ts \
  src/test/adminEdgeTenantScope.test.ts
```

Passed: 14 tests, 0 failed.

```sh
./node_modules/.bin/vitest run \
  src/test/edgeFunctionCors.test.ts \
  src/test/edgeFunctionCorsResponses.test.ts
```

Passed: 26 tests, 0 failed.

```sh
./node_modules/.bin/vitest run --reporter=json
```

Passed: 1,945 tests, 81 skipped, 0 failed; 702 suites. The 81 skipped tests
match the starting baseline.

```sh
./node_modules/.bin/eslint . -f json
```

Passed: 0 errors and 1,167 warnings. The warning count is unchanged from the
starting baseline.

```sh
./node_modules/.bin/vite build
```

Passed: 4,977 modules transformed; SEO validation passed with zero errors and
zero warnings. The pre-existing circular/dynamic chunk warnings remain, and
the main JavaScript chunk remains 1,844.96 kB (476.46 kB gzip).

Edge-specific executable response tests and the recursive 163-entrypoint
source guard passed. No deployed Supabase Edge Function was invoked.

## Remaining external blockers

- `CORS_ALLOWED_ORIGINS` must be configured with the exact approved browser
  origins in every target Supabase Edge environment before deployment. With
  no configured allowlist, browser-origin requests fail closed.
- A deployment owner must run an authenticated staging smoke test against the
  deployed Supabase Auth/RLS schema before any production release. This work
  did not deploy or modify production data.
- GitHub branch checks and human security review must complete before a merge
  decision.
- There is no runtime evidence in this remediation for NVIDIA, NVCF,
  Omniverse Kit, DSX Exchange, SimReady, telemetry, DDN, or edge execution.

## Rollback

Nothing has been merged or deployed, so the immediate rollback is to close the
draft pull request and delete `remediation/hybrid-stack-p0`.

If the commits are merged later, revert the CORS commit first and the
authorization commit second using new revert commits. No database rollback is
required because there are no migrations or data changes. Restoring the prior
code would also restore the documented vulnerabilities, so any rollback must
be treated as a security exception and reviewed before release.

## NVIDIA runtime statement

This patch does **not** make the NVIDIA hybrid runtime operational. It changes
only shared Edge Function authorization, tenant scoping, CORS enforcement,
tests, and supporting documentation.

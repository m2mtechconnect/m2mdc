# Findings Register

Severity: P0 = blocks pilot, P1 = must fix before external users, P2 = should fix, P3 = hygiene.
Confidence: High = directly observed, Medium = strong static inference, Low = needs runtime proof.

## P0 - Pilot blockers

### P0-1 Fabricated operational data rendered as live status (truthfulness violation)
Confidence: High. Runtime and source verified.

Legacy pages present hard-coded or `Math.random()` values styled as real operational telemetry,
with no `ProvenanceBadge`, no SIMULATED chip and no data-mode gating:

| Surface | Evidence |
|---|---|
| Infrastructure clusters (`uptime: "99.97%"`, `status: "healthy"`) | `src/pages/InfrastructurePage.tsx:50-56` |
| Infrastructure service table (DCIM Gateway / BMS Connector latency, "ok") | `src/pages/InfrastructurePage.tsx:70-77` |
| Connect Health source health scores and "2 min ago" sync times | `src/pages/ConnectHealth.tsx:12-18` |
| Intelligence Dashboard `roi` / `accuracy` / `total_runs` grafted onto **real** Supabase rows | `src/pages/IntelligenceDashboard.tsx:249-256` |
| Intelligence Dashboard `last_updated: new Date().toISOString()` (render time, not sensor time) | `src/pages/IntelligenceDashboard.tsx:254` |
| Integration Drawer latency / tokens / "N minutes ago" regenerated per render | `src/components/integrations/IntegrationDrawer.tsx:405-418` |
| Teams presence "Online" / "N hours ago" | `src/pages/Teams.tsx:155` |
| AOC advanced metrics total/trend/percentage | `src/components/aoc/AOCMetricsAdvanced.tsx:44-46` |

The Intelligence Dashboard case is the most serious: real database rows are decorated with
invented metrics, so a viewer cannot distinguish the true fields from the fabricated ones.

Remediation: route every one of these through `src/capabilities/operatingState.ts` +
`ProvenanceBadge`, or replace with an honest `UNAVAILABLE` empty state. Add a lint rule banning
`Math.random()` in `src/pages/**` and `src/components/**` outside `src/simulation/**`.

### P0-2 Core test suite is red
Confidence: High. Executed twice, deterministic.

1158 passed / **229 failed** / 109 pending. Categorised:

| Category | Count | Meaning |
|---|---|---|
| ASSERTION_MISMATCH | 176 | Tests encode behaviour the code no longer has (e.g. `simulationEngine.test.ts` expects `'Twin ID is required'`, code returns `'No twin selected'`) |
| BLOCKED_BY_GUARD | 29 | Integration tests hit `liveBackendGuard` and fail instead of skipping (`tests/integration/analytics-with-seeds.test.ts`, `builder-with-seeds.test.ts`) |
| CODE_DEFECT | 24 | Real errors, e.g. `tests/digitalTwinRuntime.test.ts` - `Cannot read properties of undefined (reading 'getUser')` |

A red suite means no regression protection exists for any of the security fixes below.

Remediation: (a) mark guard-blocked integration tests `describe.skip` with an explicit
BLOCKED marker so they report as blocked, not failed; (b) fix the 24 code defects;
(c) re-baseline or delete the 176 stale assertions - do not silence them wholesale.

### P0-3 No CI gate on typecheck, lint or unit tests
Confidence: High.

Workflows exist for the DSX audit chain, production perimeter and a QA suite, but nothing
fails the build on the 229 failing tests or 1322 lint errors. Every fix in this register can
silently regress.

Remediation: add a required job running `tsc --noEmit`, `eslint`, and `vitest run` on PRs.

## P1 - Must fix before external users

### P1-1 Service-role edge functions with wildcard CORS and no in-function authorisation
Confidence: Medium (platform `verify_jwt` default inferred from `supabase/config.toml`, not probed).

Of 157 functions, 82 use `Access-Control-Allow-Origin: *`, 35 use `SUPABASE_SERVICE_ROLE_KEY`,
31 do both, and **12 of those perform no in-function auth check**: `zapier-webhook-trigger`,
`zapier-action-execute`, `zapier-oauth-callback`, `zapier-auto-refresh`, `zapier-apps-sync`,
`ops-ingest-health`, `ops-events`, `ops-environments`, `website-cache-clear`, `funding-scraper`,
`templates-seed`, `metrics-summary`.

These rely entirely on the platform JWT gate. That is a single control in front of full
service-role database access. Add an explicit `auth.getUser()` / shared-secret check and an
origin allowlist in each.

### P1-2 Server-side request forgery surface on URL-fetching functions
Confidence: Medium.

`dc-scan-url`, `website-scan`, `knowledge-url` and `url-turbo-capture/deepCrawl.ts` fetch
caller-supplied URLs with no host allowlist or private-range denylist. The MCP family
(`mcp-sync`, `mcp-test-tool`, `mcp-validate`, `mcp-verify`) makes live outbound calls to
registered endpoints under the same conditions. Note the DSX transport already implements the
correct pattern (`src/dsx/.../transport.ts:36-60`) - apply it here.

### P1-3 No regression guard on the anonymous-access closure
Confidence: High (closure itself), High (absence of guard).

Runtime probe **confirms** B-03 holds today: with the publishable key, every probed table and
even the PostgREST OpenAPI root return `401 / 42501 permission denied`. This is the strongest
positive result in the audit. However nothing prevents a future migration re-granting `anon`.

Remediation: add a CI check rejecting `GRANT ... TO anon` in new migrations, plus a smoke test
asserting the anon 401.

### P1-4 98 orphaned edge functions (63% of the fleet)
Confidence: High.

No caller in `src/`. Several are privileged and destructive: `migrate-credentials-to-vault`,
`templates-seed`, `mcp-delete`, `agents-rollback`, `digital-twin-delete`. Broken callers: 0.

Remediation: confirm reachability, then undeploy or JWT-lock everything not in the pilot path.

## P2 - Should fix

- **P2-1** Sovereignty and compliance surfaces (`SovereigntyRiskOverview.tsx`,
  `SovereigntyAuditTimeline.tsx`, `src/lib/compliance/`) are not traceable to any real
  regulatory data source. High-stakes output from fixtures. Confidence: Medium.
- **P2-2** ~25 UPDATE policies omit `WITH CHECK`. Not exploitable today (Postgres reuses
  `USING`, and all reviewed clauses are symmetric ownership checks) but fragile.
- **P2-3** Tenant isolation is really *user* isolation. `org_id` exists only on `profiles`,
  `agents`, `organizations`, `industry_agents` and `dsx_*`; the rest of the model is scoped by
  `user_id`/`owner_id`. Decide and document the intended multi-user-org sharing model.
  **Runtime-unverified** - only one (admin) identity was available.
- **P2-4** `url-turbo-capture` returns `status:'success'` for degraded HTTP-fallback captures,
  masking data-quality loss downstream.
- **P2-5** 1322 lint errors, dominated by `@typescript-eslint/no-explicit-any`.
- **P2-6** `dist` is 42 MB, of which 35 MB is `dist/landing/hero-datacenter.mp4`. Move to a CDN
  or stream it.

## P3 - Hygiene

- **P3-1** DOM nesting warning on `/manage/facilities`: a `<div>` (badge) inside a `<p>`.
  `src/components/ui/badge.tsx` used inside a paragraph.
- **P3-2** Deprecated role wrappers `check_user_has_role` / `user_has_role` still present
  alongside canonical `has_role(uuid, app_role)`. Remove them.
- **P3-3** `knowledge-index` writes an `embedding_model` label without computing an embedding -
  a cosmetic field on a non-existent pipeline.

## Confirmed-good (regression-protect these)

| Control | Evidence |
|---|---|
| Anonymous Data API fully closed | Runtime: all probed tables and OpenAPI root return 401 `42501` |
| Unauthenticated route access | Runtime: `/dashboard`, `/admin`, `/teams`, `/manage/facilities`, `/dsx/evidence-beta`, `/compliance` all redirect to the public landing page |
| Roles in a separate `user_roles` table | Direct INSERT/UPDATE/DELETE revoked from `anon` and `authenticated`; mutation only via audited `SECURITY DEFINER` RPCs gated by `assert_role_admin()` |
| Self-service role-grant hole | Closed - policy dropped, plus table-level REVOKE as a second layer |
| `profiles` privilege-escalation via `org_id` | Mitigated by column privileges + `enforce_profile_immutable_columns()` trigger covering `user_id`, `email`, `org_id`, `is_approved`, `approved_at`, `approved_by` |
| Live mode fails closed | `LIVE_MODE_ENABLED = false` literal; `ACTIVE_MODE = 'SIMULATED'`; `liveDisabledAdapter.ts:24` throws rather than degrading |
| DSX transport rejects production hosts | `transport.ts:36-60` |
| Browser LLM disabled | `src/lib/llm/client.ts:40` `LLM_CLIENT_DISABLED` |
| RAG honestly stubbed | `rag-test` / `rag-upload` return HTTP 501 rather than fabricating results |
| Capability registry self-reports NO-GO | `src/capabilities/registry.ts:138-148` - 0 proven components, 24% pilot readiness |
| No secrets in the browser bundle | `dist/assets/*.js` scan found the `anon` JWT only; no `service_role` key |
| Typecheck and production build | Both PASS |
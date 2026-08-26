# AURA production-readiness remediation plan

Ordered from the findings in the read-only audit at HEAD `434b564e`. Each phase is an atomic, separately qualifiable batch. No phase merges or publishes; qualification and release stay separate steps.

## Phase 0 — Truth-in-UI enforcement (P0)

The platform currently has a correct provenance contract that some components bypass. This is the only class of defect that makes the product actively misleading, so it goes first.

- Replace unconditional `LIVE` / `Real-time` string badges with `ProvenanceBadge` driven by a real `ProvenanceMeta`, in: `EnhancedKPICockpit.tsx`, `CompactKPICockpit.tsx`, `DCSimulationTab.tsx`, `simulation/DCKPIDeltas.tsx`, `EnterpriseKPIChart.tsx`, `AnimatedKPIChart.tsx`, `overview/CompactEventTimeline.tsx`.
- Wrap the Command Centre facility figures (`src/workspace/CommandCentre.tsx`) in the provenance system so `/dashboard` states its own classification.
- Add a lint-level or test-level guard forbidding the literal strings `LIVE` / `Real-time` as badge text outside the provenance components.

Acceptance: no customer-visible surface renders a live/real-time claim that is not derived from a `ProvenanceMeta`; a contract test fails if one is reintroduced; existing truth suites stay green.

## Phase 1 — Authorization surface hardening (P0)

- Reorder the four functions that build a service-role client before caller verification (`aoc-runtime-control`, `dc-create-twin-from-recommendation`, `dc-scan-url`, `agent-suggestions`) to the verified pattern already used by `connection-credential`: anon client, `getUser`, approval/tenant/role check, then service-role client.
- Identify and fix the one RLS-enabled-no-policy table (add policies plus grants, or drop the table if orphaned).
- Review the two anon-executable `SECURITY DEFINER` functions; revoke `EXECUTE` from `anon` unless a policy genuinely needs public execution, and document any intentional exception in security memory.
- Scope the `digital-twin-assets` "web derivatives" storage read policy to org/twin ownership.
- Re-scope the executive-role broad reads on `integrations`, `integration_logs`, `contact_expert_logs`, `mcp_sync_runs` to the caller's organization.

Acceptance: security scan and database linter show no anon-executable definer functions and no RLS-without-policy table; a tenant-isolation test proves an executive in org A cannot read org B integration rows; no existing auth test regresses.

## Phase 2 — Navigation and workflow completeness (P1)

- Fix the two broken navigation targets (`/aoc` drill on the analytics page; the funding-intake demo CTA) to point at real routes or remove the affordance.
- Give `/deploy` a nav entry, and surface `/account/*` and `/marketplace` through a documented entry point so every reachable route is discoverable.
- Extend audit logging to credential rotation, invite and membership mutations, and active-org role changes.
- Restore `x-organization-id` (and `x-idempotency-key`) to the per-function CORS allow-header overrides so they match the shared contract.

Acceptance: a route-discoverability test asserts every guarded route is either in navigation or reachable from a named parent surface; every privileged mutation writes an audit row; CORS preflight contract test passes.

## Phase 3 — Persona depth (P1)

- Decide and record which of the 14 roles are product personas versus directory-only labels.
- For each product persona, define a landing experience (role-aware Command Centre sections) and a tour; today only executive, manager, engineer and security_admin have one.
- Add compliance-specific and analyst-specific permissions rather than reusing `analytics.view` as a catch-all.

Acceptance: a persona matrix test enumerates every product persona with a defined landing surface, permission set and tour; roles that are intentionally directory-only are listed explicitly.

## Phase 4 — QA integrity (P1)

- Un-skip or delete the nine always-skipped deploy E2E tests; if they cannot run, record an explicit reviewable reason.
- Convert fixture-conditional skips (agent playground, builder regression) into seeded deterministic tests so missing data fails instead of passing.
- Replace the source-string contract tests with behavioural equivalents where a behavioural assertion is possible; keep string checks only for genuinely textual guarantees (vendor-neutrality copy, for example) and mark them as such.
- Bring truth-in-UI and accessibility suites into a named release gate above `verify:fast`.

Acceptance: zero skipped tests without a documented reason; the release gate runs unit, integration, truth-in-UI and accessibility; the deploy flow has at least one executing end-to-end test.

## Phase 5 — Operations evidence (P1/P2)

- Configure the observability backend key server-side and run the synthetic probe so `runtime-monitoring-client` and `monitoring-backend` can move off Unavailable with a real artifact.
- Run a first DR exercise and log it through the existing CLI so restore, RTO and RPO stop being unknown.
- Ingest at least one hyperscaler's IaC artifacts through the multicloud evidence flow to move a single cell of the portability matrix off "not assessed".
- Add dependency-update automation to complement the existing Trivy and bun audit CI scanning.

Acceptance: at least one observability signal is `verified` with an on-disk artifact; one DR exercise record and one multicloud record exist and are accepted by their validators; no fabricated values anywhere.

## Phase 6 — Polish (P2)

- Triage `disabled` controls for visible reasons and dark-surface contrast.
- Neutralise remaining marketing-grade "real-time" copy on product surfaces.
- Retire documented-dead edge functions to reduce attack and maintenance surface.

Acceptance: accessibility suite passes at AA on dark surfaces; provider-neutrality contract test covers the remaining pages.

## Non-negotiables for every phase

Preserve auth, RLS, tenant isolation, strict CORS, service-role boundaries, provenance semantics, route semantics and release-fingerprint logic. Run the applicable qualification gate after each phase, tie any release candidate to one exact SHA, and keep coding, qualification, merge and publishing as separate steps.

# AURA Enterprise Supervisor — read-only persona and wiring audit

Head audited: `19a3f4ea` ("Audited production readiness"). No files, data, roles or deployments were changed. Everything below is backed by a file read, grep or route-table inspection performed this turn; anything not confirmed is listed under Unknowns.

## 1. Executive readiness verdict

**NO-GO for accelerated-runtime enterprise production. CONDITIONAL GO for a governed `enterprise-pilot-simulated` engagement.**

The authorization spine is real and consistently applied: `src/AuthenticatedShell.tsx` wraps product routes in `PermissionRouteGuard` and every `/admin/*` route in `AdminRouteGuard`, both fail-closed, and `src/auth/permissions.ts` keeps platform and tenant vocabularies separate. What is missing is persona breadth and end-to-end evidence, not architecture: three of the readiness registries ship empty by design, and several personas have permissions but no surface built for them.

## 2. Persona x capability matrix (status per persona)

Legend: V verified end-to-end, P partially wired, U UI-only, S simulated/demo, X unavailable, ? unverified.

| Capability | Owner | Org admin | Exec | Manager | Engineer | Operator | Compliance | Data analyst | Viewer |
|---|---|---|---|---|---|---|---|---|---|
| Command Center | P | P | P | P | P | P | P | P | P |
| Org / user administration | V | V | X | X | X | X | X | X | X |
| Onboarding submissions | V | V | X | X | X | X | X | X | X |
| Facilities | V | V | X | P | P | P | X | X | X |
| Builder | P | P | X | P | P | P | X | X | X |
| Blueprint | P | P | X | P | P | P | X | X | X |
| Connections / integrations | P | P | X | P | P | P | X | X | X |
| AI / model configuration | V | V | X | X | X | X | X | X | X |
| Simulation | S | S | S | S | S | S | S | S | S |
| Decisions / approvals | P | P | ? | ? | P | P | ? | ? | X |
| Evidence / export | P | P | P | P | P | P | P | P | X |
| Deployment activation | P | P | X | P | P | P | X | X | X |
| Agents | P | P | U | P | P | P | U | U | U |
| Analytics | P | P | P | P | P | P | P | P | P |
| Operations / incidents | S | S | S | S | S | S | S | S | S |
| Sustainability / carbon | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| Compliance | P | P | P | P | P | P | P | P | X |
| DR evidence | X | X | X | X | X | X | X | X | X |
| Multicloud evidence | X | X | X | X | X | X | X | X | X |

Two structural persona problems: `operator` and `viewer` are declared **tenant** roles in `src/auth/permissions.ts` yet the same file maps them in the **global** `ROLE_PERMISSIONS` table, so a global grant of `operator` confers platform-plane reach; and only `admin`, `security_admin` and global `owner` reach any administration surface, leaving `compliance` and `data_analyst` with export rights but no dedicated destination.

## 3. Front-end-to-back-end wiring (representative rows)

| Capability | Route / nav | Guard | Client path | Backend | Status |
|---|---|---|---|---|---|
| Activation | `/deploy`, nav child under Runtime | `deployment.execute` | Deploy page | `agents-deploy`, `canary-deploy`, `deployment_tracking` | P |
| Runtime history | `/deployments` | `deployment.view` | DeploymentHistory | `deployment_events` | P |
| People & access | `/teams`, `/teams/access-control` | `tenant.view_members`, `authz.view_assignments` | `tenant_people_access_snapshot`, `set_active_org_member_role` | RPC + RLS | P |
| Customers | `/admin/customers` | `platform.manage_customers` | Customers page | `teams-invite` (`platform_provision`) | P |
| Simulation runs | `/simulation` | none declared | `src/workspace/runPersistence.ts:151` insert | `public.simulation_runs` | P |
| Decisions | Evidence workspaces | inherits `analytics.view` | `src/dsx/runtime/decisionPersistence.ts` | `record-decision`, `decision_records` | P |
| Supervisor | `/readiness/supervisor` | `analytics.view` | `src/supervisor/*` | static registries only | S |
| DR / multicloud / smoke | Supervisor sections | `analytics.view` | `drExerciseRegistry.ts` (13 lines), `multicloudEvidenceRegistry.ts` (15), `postPublishSmokeRegistry.ts` (14) | none | X |

## 4. Findings

### P0
1. **Global/tenant role confusion is encoded in the permission table.** `operator` and `viewer` are typed as `TenantRole` but appear in the global `ROLE_PERMISSIONS` map, so a `user_roles` row with scope `global` and role `operator` grants `deployment.execute` platform-wide. Tenant authority must not be derivable from a global grant.
2. **Three readiness registries are empty and drive customer-visible verdicts.** `drExerciseRegistry.ts`, `multicloudEvidenceRegistry.ts` and `postPublishSmokeRegistry.ts` contain no records; every DR, portability and post-publish claim in the Supervisor is unbacked. Correct today only because the UI says "not assessed" — one careless default flips this into fabricated evidence.
3. **`/simulation` has no route guard.** Unlike `/builder`, `/analytics` and `/compliance`, the simulation route is mounted without `PermissionRouteGuard`, so any approved account reaches it and its writes to `public.simulation_runs`.

### P1
4. Operations, incidents and sustainability surfaces are fixture-driven (`DCIncidentTimeline.tsx`, `SovereignDCSimulationDashboard.tsx`) with no incident table behind them; there is no `incidents` relation in the schema.
5. Denial-path test coverage is thin: only `compliance-route-guard-contract.test.ts` targets a denial explicitly. No test asserts that `viewer` is refused `/deploy`, that `data_analyst` is refused `/admin/*`, or that a cross-tenant facility read fails.
6. Several "contract" tests assert source strings via `readFileSync` + `toContain` rather than behaviour, so they pass while the guarded logic is broken.
7. Sustainability tables (`twin_carbon_emissions`, `twin_financial_records`) are referenced only by `useTwinData.ts` and `TwinDebug.tsx` — no production surface renders them, so the capability is backend-only.
8. Nav breadth vs persona: `MANAGE_NAV` gates Facilities, Blueprint and Connections on `twin.edit`, which excludes `executive`, `compliance` and `data_analyst` from ever discovering the facility they are meant to report on.

### P2
9. `agent-export` and `analytics-export` edge functions exist but no component imports them; export is backend-only.
10. `FundingIntakeDemo` and `OverlayFixtures` are DEV-only lazy imports — correct, but they leave dead nav references in older docs.
11. `docs/audit/deep-page-wiring/data-contract-matrix.csv` still records the pre-fix claim that no simulation write exists; the code now writes at `runPersistence.ts:151`. Documentation contradicts code.

## 5. Verified strengths

- Fail-closed route authorization with a loading, unauthenticated, tenant-unresolved and denied state each rendered distinctly (`PermissionRouteGuard.tsx`).
- Platform vs tenant separation is asserted by tests (`tests/unit/organization-authorization.test.ts`): a tenant owner never gains `platform.manage_customers`.
- Server-authoritative active organization via `active_org_id()` with a deterministic fallback ordering.
- 166 edge functions with a shared CORS module and a single documented unauthenticated function.
- `useUserPermissions` reduced to a shim over the canonical context, removing the second authorization system.

## 6. Unknowns and blocked checks

- Runtime NVIDIA / DSX / Omniverse behaviour cannot be assessed without hardware evidence; the registry status is honest.
- RLS effectiveness per persona needs an authenticated multi-tenant probe, not source reading.
- Hyperscaler portability needs IaC artifacts that are not in the repository.
- Whether `agent_suggestions_cache` and similar service-role-only tables are intentionally unreachable was inferred, not confirmed by policy dump.

## 7. Ordered remediation batches

**Batch 1 — authorization correctness (P0-1, P0-3).** Remove `operator` and `viewer` from the global `ROLE_PERMISSIONS` map or split the map into platform and tenant tables; add `PermissionRouteGuard permission="twin.view"` to `/simulation`. Acceptance: a global `operator` grant no longer yields `deployment.execute`; an approved account without `twin.view` is redirected from `/simulation`; both covered by new denial tests.

**Batch 2 — denial-path coverage (P1-5, P1-6).** Add behavioural route-guard tests per persona for `/deploy`, `/admin/*`, `/teams/access-control`, `/simulation`. Replace the string-matching contract tests in the touched files with rendered assertions. Acceptance: each persona has one allow and one deny test; no `readFileSync` assertion remains in those files.

**Batch 3 — truthful capability states (P0-2, P1-4, P1-7).** Make the three empty registries structurally incapable of reporting a pass without an `artifactRef`; label incident and sustainability surfaces as demonstration fixtures with a provenance badge. Acceptance: a contract test fails if any registry entry claims verified status without an artifact hash.

**Batch 4 — persona discoverability (P1-8, P2-9).** Give read-only personas a route to Facilities and Blueprint in read mode, and wire the export functions to the Evidence surface. Acceptance: `executive`, `compliance` and `data_analyst` each reach every capability their permission set implies, asserted by a navigation-coverage test.

**Batch 5 — documentation reconciliation (P2-11).** Refresh the audit matrices to match current code.

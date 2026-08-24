# AURA DC — End-to-End Audit (read-only) and Remediation Plan

Source audited: `/dev-server` HEAD `69cc2b0bd103ca1bd9124f32227b30cf02e25627` (clean tree, tracking `main`).
Production audited: `https://auradc.m2mtechconnect.com`, `release.json` sha `69cc2b0b…`, buildId `bmt7g92iu`, `x-deployment-id 6649b40d…`. Source and production are byte-aligned. Nothing was edited, deployed or mutated.

## Executive summary

The platform is structurally sound in the places that matter most: a single canonical permission model, a fail-closed admin guard, an origin-allowlist CORS layer with zero wildcards, honest provenance labelling (simulated data is disclosed, not disguised), and durable server-side simulation run persistence. The failures are concentrated in three areas.

1. **Authorization is enforced asymmetrically.** Navigation hides links by permission, but most routes mount with no route-level guard. `/settings/ai`, `/app/agents`, `/analytics`, `/deploy`, `/deployments`, `/manage/*` and `/teams/access-control` are reachable by typing the URL. Only `/admin/*`, `/twin-debug` and `/teams/onboarding` are wrapped in `AdminRouteGuard`.
2. **Unauthenticated service-role edge surface.** ~148 of 164 edge functions have no `verify_jwt` entry in `supabase/config.toml`, and a live probe confirmed `/ai-config` returns HTTP 200 with a deliberately invalid bearer token, disclosing provider configuration.
3. **Third-party brand leakage in customer-facing copy.** NVIDIA, Omniverse, DSX, Gemini, OpenAI and one stray "CoPilot" literal are rendered in UI text, dropdowns, placeholders and an exported HTML report.

Two structural debts sit underneath: a second tenant resolver (`profiles.org_id`) alongside the canonical `org_memberships`/`active_org_id()` path, and roughly 113 zero-reference source files including two apparently orphaned feature clusters.

## Severity-ranked findings

### P0
None confirmed. No cross-tenant data leak, no auth bypass into `/admin/*`, no unvalidated LIVE claim was proven. `AdminRouteGuard` fails closed and tenant users can never satisfy `resolution.status === 'internal'`.

### P1 — must fix before next release

| # | Finding | Evidence |
| --- | --- | --- |
| P1-1 | Sensitive routes mounted with no route-level guard; pages perform no in-component RBAC check either. `ManageAgents.tsx` and `AISettings.tsx` import no RBAC at all, yet `/settings/ai` governs agent grounding and safety config. | `src/AuthenticatedShell.tsx:96,97,100,122,123,125,140`; `src/pages/ManageAgents.tsx`; `src/pages/AISettings.tsx` |
| P1-2 | Unauthenticated edge functions holding service-role credentials. Live probe: `GET /ai-config` with `Authorization: Bearer invalid.token.value` → HTTP 200 body containing `"active_provider":"lovable_managed"`. Same no-auth pattern in `funding-query`, `generate-ai-recommendations`, `grounded-summary`, `query-answer`, `template-validate`, `health-ai`, `generate-ctas`. `query-answer` and `website-cache-clear` read `SUPABASE_SERVICE_ROLE_KEY`. | `supabase/config.toml` (16 `[functions.*]` entries for 164 function dirs); live probe |
| P1-3 | Two competing tenant resolvers. Connections and Account Settings read `profiles.org_id`; RBAC reads `org_memberships` + `active_org_id()`. `set_active_org()` does currently write both (bridge period), so this is a latent divergence rather than an active bug — but it will break the moment the bridge is removed. | `src/connections/api.ts:46-88`; `src/pages/account/Settings.tsx:105-110`; `src/contexts/RBACContext.tsx:170-231,291-315`; `supabase/migrations/20260823220500_org_membership_foundation.sql:138-175` |
| P1-4 | Provider-name leakage in rendered UI and in a customer-facing export. | `src/lib/provenance/exporters/printHtml.ts:82` ("NVIDIA runtime used" in exported HTML); `src/components/integrations/NvidiaDsxReadinessPanel.tsx:92,140-141`; `src/pages/InfrastructurePage.tsx:45,861,925`; `src/components/dataset/ReferenceSurface.tsx:492-533`; `src/pages/admin/AssetPipeline.tsx:42,72`; `src/i18n/locales/en.ts:236,1069,1090` and `fr-CA.ts` mirrors |
| P1-5 | `/admin/customers` is guarded but has no nav entry anywhere in `appNavigation.ts` — reachable only by direct URL. Either a nav regression or an undocumented deep link. | `src/AuthenticatedShell.tsx:113`; `src/config/appNavigation.ts:177-244` |

### P2 — UX correctness and consistency

| # | Finding | Evidence |
| --- | --- | --- |
| P2-1 | Persona copy is wrong. The invite modal labels `executive` as "Full platform access"; the role actually maps to viewer-tier plus export and member-view. | `src/components/.../InviteTeamMemberModal.tsx:25` vs `src/auth/permissions.ts:117` |
| P2-2 | Nav/page permission divergence: the Access Control link shows on `authz.view_assignments`, the page gates on `authz.manage_assignments`. `compliance` users see a link they cannot use. | `src/components/.../PeopleAccessLayout.tsx:23`; `src/pages/AccessControl.tsx:164` |
| P2-3 | Persona grant surface mismatch: invites can assign 9 platform roles, the manual grant dropdown offers only `admin|operator|viewer`. | `src/pages/AccessControl.tsx:42` vs `InviteTeamMemberModal.tsx` |
| P2-4 | Stray un-i18n'd literal `Ask CoPilot:` bypassing the AURA Assistant rename. | `src/twins/sovereignDataCenter/components/SovereignDCSimulationDashboard.tsx:229` |
| P2-5 | Typography floor violated: `text-[9px]/[10px]/[11px]` used **457 times across 149 files**, well beyond badge/telemetry use. Violates the ≥12px body / ≥11px label standard. | `components/dsx/*`, `components/simulation/*`, `components/blueprint/*`, `components/dc-twin/*` |
| P2-6 | Design-token bypass: 264 raw hex literals in `.ts/.tsx`, plus `text-white` ×56 and `bg-black` ×9. Colors like `#3AB6FF`, `#FFD700`, `#22c55e` map to no token and render off-brand in both themes. | `src/workspace/FacilityFloorPlan.tsx` (34), `printHtml.ts` (18), `ROISection.tsx` (17) |
| P2-7 | Label drift: nav "Operations" → route `/analytics` → component `IntelligenceDashboard`. Three names, one destination. | `src/config/appNavigation.ts:131` |
| P2-8 | Visible `(demo)`, `DEMO`, `SIMULATED`, "Not implemented" and "coming soon" states shipping to customers. These are honest disclosures rather than deception, but they are a GA decision. | `src/pages/Compliance.tsx:268-311`; `src/pages/Help.tsx:207,211`; `src/components/connections/AgentToolsTab.tsx:36-37`; `src/i18n/locales/en.ts:1050` |

### P3 — cleanup and performance

| # | Finding | Evidence |
| --- | --- | --- |
| P3-1 | ~113 source files with zero static import references. Two whole clusters look orphaned: `components/search/*` (11 files, ~115KB) and `components/workflow/*` (9 files, ~65KB). | heuristic reference scan across 1292 files |
| P3-2 | Superseded admin pages not routed anywhere: `AdminSignupsDashboard.tsx` (14.3KB), `AdminUserApproval.tsx`. NEEDS_MIGRATION into the `/admin/*` console. | not present in `AuthenticatedShell.tsx` route table |
| P3-3 | 15 unused shadcn primitives (~70KB source). SAFE_TO_DELETE pending confirmation. | `src/components/ui/{calendar,carousel,chart,menubar,…}.tsx` |
| P3-4 | Competing state stores and mock modules: `wizardBuilderStore.ts` (935 lines) vs `dcTwinBuilderStore.ts` (894 lines); `twins/dataCenter/mockData.ts` (954) vs `twins/sovereignDataCenter/mockData.ts` (1190). | file inventory |
| P3-5 | Large alias/redirect surface: `ROUTE_ALIASES` plus 11 hand-written `PreserveNavigate` redirects for the Evidence IA reshuffle. KEEP_COMPAT until external link decay is measured. | `src/AuthenticatedShell.tsx:146-176` |
| P3-6 | Deprecated shim `useUserPermissions.ts` still live at `AccessControl.tsx:34` and `Teams.tsx`. | `src/hooks/useUserPermissions.ts:8-16` |

## What is healthy (do not "fix")

- `AdminRouteGuard` fails closed on loading, error and non-internal resolution (`src/routing/AdminRouteGuard.tsx:32-58`).
- Zero wildcard CORS anywhere in `supabase/functions`; `_shared/cors.ts` uses a verified origin allowlist.
- `runPersistence.ts` is genuinely wired to `simulation_runs`, derives ownership from `auth.getUser()` (never client-supplied), and labels runs `client-produced-unverified` rather than claiming validation.
- The `simulated`/`not measured`/`never fabricated` language across `src/data/dataset/**` and `src/capabilities/**` is an anti-fabrication guardrail, working as designed. Do not strip it.
- Production security headers present: HSTS, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`. SPA 404s return 200 by design with a client-side `NotFound` catch-all.

## Remediation plan

### Phase A — must fix before next release
1. Extend route-level guards to every permission-bearing route (`/settings/ai`, `/app/agents*`, `/analytics`, `/deploy`, `/deployments`, `/manage/*`, `/teams/access-control`), reusing the `AdminRouteGuard` pattern with the permission already declared in `appNavigation.ts`. Add in-page checks to `AISettings` and `ManageAgents` as defense in depth.
2. Add explicit `verify_jwt = true` entries for every edge function that is not a signature-verified webhook or OAuth redirect target; add in-code caller identity checks to the seven AI/data handlers listed in P1-2. Re-probe `/ai-config` to confirm 401.
3. Remove provider names from the export template (`printHtml.ts:82`) and from the highest-traffic rendered surfaces; keep the internal capability identifiers unchanged.
4. Restore or intentionally remove the `/admin/customers` nav entry.

### Phase B — UX cleanup
5. Fix the `executive` role copy, reconcile the Access Control nav/page permission pair, and align the grant dropdown with the invite role set.
6. Route the stray `Ask CoPilot:` literal through i18n.
7. Typography and token sweep: raise sub-12px body/label text to the standard, migrate the 264 raw hex literals and `text-white`/`bg-black` usages onto tokens, starting with `FacilityFloorPlan.tsx` and `ROISection.tsx`.
8. Settle the "Operations / analytics / Intelligence" naming and make a product decision on the visible `(demo)` and `SIMULATED` labels.

### Phase C — retirement and performance
9. Confirm the 113 zero-reference candidates with a bundler trace (`madge` or `vite-bundle-visualizer`) before deleting anything; the regex heuristic misses barrel re-exports and string-based dynamic imports.
10. Retire the `search/*` and `workflow/*` clusters if the trace confirms them dead; migrate the two superseded admin pages; prune unused shadcn primitives.
11. Consolidate the duplicate builder stores and twin mock modules; retire `useUserPermissions.ts` call sites.

## Evidence gaps (stated, not guessed)

- Per-component RBAC gating inside `Deploy`, `DeploymentHistory`, `Compliance`, `InfrastructurePage`, `Marketplace` and `ManageFacilities` was not fully read; only import-level signals were checked.
- RLS policy bodies for `connection_instances`, `simulation_runs` and `agents` were not inspected; frontend tenant filters are defense in depth only.
- Runtime UX checks (focus traps, first-run tours, per-panel empty/error states, mobile breakpoints) require an interactive browser pass, not performed under the read-only constraint.
- The 113 dead-file candidates are heuristic and must not be deleted on this evidence alone.
- Whether `text-gray-400/500/700` instances (~16 files) actually sit on dark graphite surfaces needs visual confirmation.

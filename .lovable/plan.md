# AURA DC information-architecture and UX consolidation analysis

Read-only analysis at commit `6098e0c9149ab8d939aeebc4b8588c43392d4743`. No code was edited, nothing was deployed, no route was created. Everything below reuses routes and components that already exist in `src/config/routeRegistry.ts`, `src/config/appNavigation.ts` and `src/config/pagePositioning.ts`.

## 1. Page-purpose registry (current visible destinations)

Legend for disposition: KEEP = canonical page; TAB = becomes a tab/panel inside an existing page (route stays mounted as a deep link); ADMIN = stays but only under Platform Administration; REDIRECT = already or should be alias-only; RETIRED = already retired.

| Route | Owning workflow | Primary persona | Unique outcome | Data authority | Permission | Disposition |
|---|---|---|---|---|---|---|
| `/dashboard` | Overview | Executive, operator | See facility status and priority actions | facilities + runs | none (session) | KEEP (single entry) |
| `/builder` | Build | Engineer | Create/configure the facility twin | `data_centre_twins` | `twin.view` (edits `twin.edit`) | KEEP (canonical Build) |
| `/manage/facilities` | Build | Engineer, executive (read) | Site/hall/capacity lifecycle | facilities tables | `twin.view` | TAB of Build ("Facilities") |
| `/blueprint`, `/blueprint/:id` | Build | Engineer | Topology, OpenUSD assemblies, versions | blueprint model | `twin.view` | KEEP as Build sub-destination |
| `/blueprint/preview` | Build | Engineer | Recommendation preview | client recommendation store | `twin.view` | Deep link only; not in nav (already production-blocked) |
| `/manage/integrations` | Build/Connect | Org admin, engineer | Connect systems, storage, APIs | connections registry | `twin.edit` | TAB of Build ("Connections") |
| `/settings/ai` | Govern (config) | Org admin / agent admin | Agent policy, profiles, safety | AI config | `agent.administer` | Move under Govern > Agent configuration; not a Build item |
| `/simulation`, `/simulation/preview` | Simulate | Engineer | Run/compare scenarios | simulation provider | `twin.view` | KEEP (`/simulation/preview` deep link only) |
| `/analytics` | Operate | Operator, executive | Telemetry, health, availability | measured + simulated series | `analytics.view` | KEEP (canonical Operations) |
| `/app/agents` (+ `:slug/detail`, `:agentId/manage`) | Operate | Operator | Agent scope, recommendations, audit | agent tables | `agent.view` | TAB/child of Operations |
| `/deploy` | Operate | Operator with execute | Activate a configuration | deployment records | `deployment.execute` | TAB of Runtime ("Activation") |
| `/deployments` | Operate | Operator, auditor | Immutable lifecycle history | deployment events | `deployment.view` | KEEP as Runtime canonical |
| `/evidence/*` (overview, operations/*, sustainability/*, decisions/*, assets) | Govern | Compliance/auditor | Provenance-backed evidence and exports | evidence store | `analytics.view` | KEEP (canonical Evidence, own sub-nav) |
| `/compliance` | Govern | Compliance | Decision replay / audit view | mixed, partly demo-labelled | `analytics.view` | MERGE into `/evidence/decisions`; keep route as alias |
| `/readiness/supervisor` | Govern | Platform admin, executive | Deterministic readiness + release gate | supervisor registries | `analytics.view` | Demote: Platform Administration for admins, read-only card link from Evidence for executives |
| `/teams`, `/teams/access-control` | People | Org admin | Members, roles, invitations | org membership | `tenant.view_members` | KEEP (canonical People & Access) |
| `/teams/onboarding` | People | Platform admin | Approve signups / submissions | onboarding tables | admin guard | TAB of People & Access |
| `/admin/platform-readiness` | Platform admin | Platform admin | Environment readiness/blockers | readiness registry | `platform.view_admin_console` | ADMIN (console home) |
| `/admin/accelerated-ai-capabilities` | Platform admin | Platform admin | Capability claims and evidence | capability registry | admin | ADMIN tab |
| `/admin/dataset-registry` | Platform admin | Platform admin | Dataset validation state | dataset registry | admin | ADMIN tab |
| `/admin/asset-pipeline`, `/admin/asset-validation/:id`, `/admin/asset-preview` | Platform admin | Platform admin | Derivatives and GPU validation | asset pipeline | admin | ADMIN: one page, three tabs |
| `/admin/reference-facility-validation` | Platform admin | Platform admin | Reference model validation | validation evidence | admin | ADMIN tab |
| `/admin/customers` | Platform admin | Platform owner | Customer provisioning | customers | `platform.manage_customers` | ADMIN (owner only) |
| `/twin-debug` | Diagnostics | Platform admin | Raw twin/query diagnostics | raw queries | admin | ADMIN, diagnostics only, never in ordinary nav |
| `/search` | Support | All | Cross-entity find | search index | none | KEEP as utility (command bar) |
| `/help` | Support | All | Guides and governance docs | static docs | none | KEEP as utility |
| `/account/settings`, `/account/profile` | Support | All | Profile, security, prefs | profile | none | KEEP as avatar menu |
| `/data-centre-twin*`, `/twin-preview`, `/omniverse-scene`, `/twin-datacentre`, `/studio/systems/:id/manage`, `/twins/:id/manage`, `/dsx/evidence-beta/*`, `/evidence/<flat>` | Legacy | n/a | none unique | n/a | varies | REDIRECT / deep link only, never emitted |
| `/marketplace` | Build | n/a | none | n/a | `twin.edit` | RETIRED (already redirects to `/builder#templates`) |

## 2. Before/after navigation map by persona

Before: every persona sees the same 7 top items plus Design & Build's 4 children and Platform Administration's 7 technical pages, filtered only by permission.

After (five permanent lifecycle destinations, max 2 levels deep; People & Access and Platform Administration are permission-aware account/admin destinations, already applied in the shell):

```text
Command Center      /dashboard
Design & Build      /builder            > Facilities | Blueprint | Connections
Operations          /analytics          > Agents | Runtime (Activation | History)
Simulation          /simulation
Evidence            /evidence/overview  > Operations | Sustainability | Decisions | Assets
Account menu        Profile | Preferences | Language | Learning Hub
                    Administration: People & Access | Platform Administration (permission-gated)
Utilities           Search, Help (top bar, not in the rail)
```

| Persona | Sees | Does not see |
|---|---|---|
| Executive | Command Center, Evidence, Operations (read), People & Access in account menu | Build, Simulation, Platform Administration |
| Operator/engineer | Command Center, Build, Simulation, Operations | Platform Administration; People & Access unless member-view granted |
| Compliance/auditor | Command Center, Evidence (incl. Decisions), Operations read | Build, Simulation, any Administration entry |
| Organization admin | All tenant destinations + People & Access, Agent configuration | Platform Administration |
| Platform admin | All of the above + Platform Administration console (7 pages as tabs) | n/a |


Presentation only. Visibility keeps deriving from `can(permission)` in `appNavigation.ts`; no persona label ever grants access, and every page keeps its own route guard.

## 3. Concrete consolidations (no new routes)

1. `/compliance` renders inside `/evidence/decisions` as a section; `/compliance` stays mounted and redirects. Reuses the existing compliance page component.
2. `/manage/facilities`, `/blueprint`, `/manage/integrations` become children of Build in the nav tree only (`children` on the `/builder` item, which `primaryNavigation()` already supports).
3. `/settings/ai` moves from the Build group to the Govern group in `appNavigation.ts` (`group: 'govern'`), matching its `pagePositioning` breadcrumb which already says Govern.
4. `/app/agents` and `/deployments` stay as Operate children; `/deploy` remains the Activation child under Runtime, as already modelled.
5. Administration collapses to one nav entry (`/admin/platform-readiness`) whose child list renders as in-page tabs; asset preview/pipeline/validation collapse into one Asset derivatives tab set. `/twin-debug` leaves the nav entirely and is reachable from an Administration > Diagnostics link.
6. `/readiness/supervisor` drops out of the Evidence child list for non-admins and appears as an Administration tab plus a read-only card on Evidence overview.
7. Preview routes (`/blueprint/preview`, `/simulation/preview`) stay unlisted deep links, consistent with the production-blocked classification.

## 4. Interaction principles

- Maximum useful depth: 2 (group > page). In-page tabs are the third layer and must be deep-linkable via `?tab=`.
- Desktop: persistent rail with the 6 groups; children appear in a page-level tab bar, not as a flyout tree. Active state from `isNavItemActive`.
- Mobile: bottom bar limited to Overview, Operate, Evidence, plus "More" sheet holding remaining groups; children are a horizontally scrollable tab strip inside the page. No nested accordions.
- Progressive disclosure: default view shows the outcome (status, evidence, action). Registries, diagnostics, raw IDs and provenance internals sit behind an explicit "Details"/"Provenance" disclosure.
- Empty and unavailable states stay explicit ("not assessed", "no evidence") rather than hidden.
- Every consolidated destination keeps a stable URL so bookmarks and shared links resolve in one hop.

## 5. Risks

- Auth/RLS: nav changes are presentation only; risk is assuming a hidden item is protected. Every moved destination must keep its `PermissionRouteGuard`/`AdminRouteGuard`.
- Tenant isolation: Build children (Facilities, Blueprint) depend on active org resolution; grouping must not bypass the `activeOrgId` gate or the tenant-unresolved recovery state.
- Deep links: consolidations that turn pages into tabs break bookmarks unless the old route redirects to `parent?tab=...` in a single hop, preserving query and hash.
- Provenance: merging `/compliance` into Evidence must carry the existing DEMO/REFERENCE labels; simulated data must never inherit Evidence's measured framing.
- Tests: `src/config/__tests__/appNavigation.test.ts`, `tests/unit/navigation-consolidation-authority.test.ts`, `navigation-consolidation-matrix.test.ts`, `persona-navigation-coverage-contract.test.ts`, `routeRegistry.test.ts` and the production-perimeter suites all assert current strings and groupings; each checkpoint must update them in the same change rather than after.

## 6. Variant implementation plan (reversible checkpoints)

Each checkpoint is one atomic, revertible change qualified with `verify:fast`, typecheck, lint and build. No deploy in any checkpoint.

- C0 (done): global rail reduced to the five lifecycle destinations; People & Access and Platform Administration moved into the permission-aware account menu and mobile Administration section, enforced by the navigation matrix test.
- C1 (config-only, zero UI risk): move `/settings/ai` to `govern`, keep `/twin-debug` and `/readiness/supervisor` out of ordinary nav lists; update nav contract tests.
- C2: express Build children (Facilities, Blueprint, Connections) through the existing `children` mechanism; update matrix tests.
- C3: collapse Administration into one entry with child tabs; keep all `/admin/*` routes and guards mounted; add a drift test that no admin route disappears from `routeRegistry`.
- C4: merge `/compliance` presentation into `/evidence/decisions`, keep `/compliance` as a single-hop redirect preserving query/hash; extend the compliance guard contract test.
- C5: mobile shell (bottom bar + More sheet) and desktop page-level tab bar with `?tab=` deep links.
- C6: progressive-disclosure pass (details/provenance disclosures) plus a persona-coverage test asserting each persona reaches every entitled outcome within two clicks.

Rollback: any checkpoint reverts independently because routes and guards are never removed, only re-grouped.

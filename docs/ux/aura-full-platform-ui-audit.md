# AURA DC - full-platform UX/UI audit and remediation

- Audit date: 2026-08-21
- Starting SHA: `bbab1da3f9d3db94b6012d687a68941d63fee4a7`
- Final SHA: see Git commit containing this document (exact SHA reported in the agent response for this closeout edit)
- Scope: presentation and accessibility only. No backend, routing, auth/RBAC, query/mutation, migration, RLS/CORS, provenance/truth, CI or release changes.
- No visual baselines or snapshots were updated.

## 1. Route inventory actually checked

Sourced from `src/config/appNavigation.ts`, `src/AuthenticatedShell.tsx` and the route registry; routes were not altered.

**Core**
- `/dashboard` (Command Center)
- `/blueprint/default` (Blueprint, 3D technical zone)
- `/simulation` (Simulation, 3D technical zone)
- `/dsx/evidence-beta/overview` (Evidence)

**Operations**
- `/manage/facilities`
- `/manage/integrations` (Connections and Data Exchange)
- `/connect/monitor`
- `/analytics` (Telemetry and Analytics)
- `/deployments`
- `/app/agents`
- `/builder`

**Governance**
- `/admin/platform-readiness` (Govern / readiness control board, routable under current auth)
- `/settings/ai` (approved providers, grounding and agent governance)

**People and Admin**
- `/teams`
- `/admin/signups-dashboard`

**Support**
- `/help`
- `/search`

**Auth-adjacent (code review only, not browser-smoked in this pass)**
- `src/components/auth/AuthLayout.tsx`, `src/pages/Onboarding.tsx` (AURA logo regression guard surfaces)

## 2. Shared primitives audited

- `src/index.css` `.aura-v2` token layer (canvas, panel, header, graphite technical chrome, semantic state hues, disabled/focus/placeholder roles)
- `src/components/Layout.tsx` (light app bar, nav breakpoints, mobile drawer, user menu)
- `src/components/brand/AuraLogo.tsx` (`AuraLogo`, `AuraNodeMark`)
- `src/components/v2/*` (`Panel`, `SubPanel`, `TelemetryRail`, `CommandHeader`, `InspectorPanel`, `OperationalTable`, `StateView`, `ProvenanceBadgeV2`)
- `src/components/shared/StatusPill.tsx`
- `src/components/capability/OperatingStateBar.tsx`, `src/capabilities/operatingState.ts`
- `src/workspace/FacilityCanvas.tsx`, `src/workspace/FacilityFloorPlan.tsx`, `src/workspace/FacilityGeometrySelector.tsx`
- `src/components/dc-ui/DCSimulationControls.tsx`
- shadcn/Radix primitives under `.aura-v2`: button, select, dropdown, popover, dialog, sheet, tabs, table, badge, input

## 3. Root causes

1. **Cascade inversion in technical zones.** `.v2-tech-zone` / `.v2-viewport` force graphite foregrounds on all descendants, but canvas chrome (toolbars, chips, legends, banners) carries its own light surface. Light-on-light was the result.
2. **Token drift.** Legacy utilities (`text-secondary`, `text-gray-400`, `text-amber-700`, `text-emerald-700`) and near-AA semantic hues were used as text on soft same-hue tints, landing at 3.7-4.5:1.
3. **No enforced minimum text size.** Sub-12px labels were free to appear on ordinary enterprise surfaces, not only in instrumentation.
4. **Third-party chart chrome** (recharts legends) inherited a series token instead of the surface foreground.

## 4. Findings and fixes

### P0
- **Light overlay chrome inside dark technical zones was unreadable.** Blueprint and Simulation canvas toolbars, the zoom control group, the degraded-mode notice and the running-scenario banner render white pills inside `.v2-tech-zone`, so labels ("2D", "Thermal", "Facility geometry", "Baseline preview", "Under 22 degC") inherited graphite/near-white foregrounds. Measured **1.07:1 and 1.63:1**.
  **Fix:** new `v2-surface-light` escape scope in `src/index.css` (foreground, muted, label, field-label, disabled-control resets) applied to the four overlay containers in `src/workspace/FacilityCanvas.tsx`. Re-measured clean at every viewport.
- **Chart legend text at 1.15:1** on Analytics (`recharts-legend-item-text`, near-white on a white card).
  **Fix:** legend text bound to `--foreground` on light surfaces and `--v2-graphite-fg` inside technical zones (`src/index.css`).

### P1
- **White-on-green primary action below AA:** measured **4.17:1**. `--v2-tech-strong` darkened `82 100% 27%` -> `82 100% 25%` -> **`82 100% 21%`** (also used as accent text on light tints, now ~5:1); hover step moved to `82 100% 21%`/`21%` family in `.v2-action-primary`.
- **Disabled control foreground too light:** `--v2-disabled-fg` `215 12% 52%` -> **`215 14% 42%`**, keeping disabled controls identifiable rather than blank.
- **StatusPill semantic correction** (`src/components/shared/StatusPill.tsx`): removed `text-secondary` (near-white on the light canvas) and `text-gray-400` on gray fills; now `success` / `destructive` / `warning` / `muted` semantic pairs.
- **Tinted status chips below AA** (3.77-4.47:1) across Command Center, Simulation, Analytics and Platform Readiness: `--v2-verified` -> `82 100% 20%`, `--v2-simulated` -> `33 94% 26%`, `--v2-neutral` -> `215 14% 36%`, `--text-subtle` -> `215 14% 38%`, `--v2-placeholder` -> `215 14% 40%`, plus a mapping of hardcoded `amber/emerald/green/red/blue` text utilities onto the semantic hues under `.aura-v2`.

### P2
- **Minimum ordinary text size hardening:** sub-12px text raised to 12px platform-wide under `.aura-v2`; telemetry rails and canvas viewports intentionally retain an 11px instrument scale.
- **Table, focus, ghost/outline and nested-panel hardening:** readable table headers (12px, muted token), visible row separators, a consistent `:focus-visible` outline on light surfaces, visible hover/border treatment for ghost and outline controls (including on graphite), and removal of duplicate elevation on nested panels.
- **Floor-plan SVG labels** (`src/workspace/FacilityFloorPlan.tsx`): 10 / 10.5px instrument labels raised to 11px.
- **Legacy gray utilities** (`text-gray-400`, `text-slate-400`, `text-zinc-400`) mapped to `--text-muted` outside technical zones; `src/pages/Deploy.tsx` icon moved to `text-muted-foreground`.

### P3
- Icon-only simulation transport controls already carry accessible names; 0 unnamed controls were observed across the whole matrix.

## 5. Previous corrective work that remains in force

- Light Salesforce-style application bar (`.v2-appbar`) with graphite text/icons and NVIDIA-green active indicators.
- AURA brand system (`M2M | [AURA node] AURA`), with the auth-adjacent `m2mLogo` regression guard in `src/test/brandAssetRegression.test.ts`.
- Menu, popover, dialog and sheet contrast hardening under `.aura-v2`.
- Semantic operating-state badges (`v2-badge-live` / `-simulated` / `-demo` / `-not-assessed`) driven by `src/capabilities/operatingState.ts`.
- Accessible names on the icon-only simulation controls.

## 6. Intentionally unchanged

- Backend, auth/RBAC, RLS, CORS, edge functions, migrations, queries and mutations.
- Provenance, truth-chain and release-control semantics (`configured != connected`, `reachable != data flowing`, `planned != available`).
- Routes and navigation structure.
- Public marketing landing branding (parent-brand raster mark remains exempt).
- CI workflows and visual baselines.

## 7. Verification

Authenticated browser session, real routes, no mocks. **45 route-viewport checks**, 6 viewport sizes:
1920x1080, 1440x1000, 1280x900 (full desktop route set) and 1024x900, 768x1024, 390x844 (Command Center, Blueprint, Simulation, Connections).

Per check: body horizontal overflow, header/nav clipping, unnamed controls, sub-12px text, and composited (alpha-aware) contrast of every text node against its real background stack.

Result after remediation: **0 horizontal overflow, 0 header clipping, 0 unnamed controls, 0 contrast failures** across all 45 checks. Screenshots captured per route/viewport during the run.

Tests:
- `bunx tsgo --noEmit` - clean
- `bunx vitest run src/test/brandAssetRegression.test.ts` - 2 passed

## 8. Known residual issues

- **Deliberately retained microtext:** 10-11px recharts axis/tick labels on `/analytics` and 11-11.5px SVG floor-plan instrument labels on `/dashboard`. These are instrumentation, not prose, and sit inside chart/technical surfaces.
- **`src/config/__tests__/routeRegistry.test.ts`** pre-existing drift from stale route declarations was left untouched, per the no-route-change constraint.
- Keyboard-only traversal, screen-reader narration, reflow at 400% and reduced-motion behaviour remain manually unverified.

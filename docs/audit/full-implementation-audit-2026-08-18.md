# AURA DC - Full Implementation Audit (2026-08-18)

All results below are from commands executed against this working tree on the
date above. Nothing here is inferred.

## 1. Automated gates (executed)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `tsgo --noEmit` | PASS, 0 errors |
| Unit/integration | `vitest run` | 189 files passed, 9 skipped; 1966 tests passed, 91 skipped, 0 failed |
| Lint | `eslint .` | 0 errors, 1347 warnings (all `no-explicit-any`, under the ratchet) |
| Production build | `vite build` | PASS, SEO gate PASS (0 errors, 0 warnings) |
| Pilot bundle canary | `scripts/pilot-bundle-canary.mjs` | PASS, 7 modules, 0 forbidden imports |
| Route-commit stress | `playwright.route-stress.config.ts`, 30 cold + 50 warm | 0/80 failures (was 11/24) |
| Security scan | Supabase + Lovable scanners | 0 critical, 5 warnings |
| Truth-in-UI subset | `reference-facility-regression`, `twin-canvas-mounting`, `facility-visualisation` | 8 passed, 3 FAILED |

## 2. Confirmed closed

The Suspense route-commit defect is fixed and guarded. `AuthenticatedShell` is a
synchronous import (`src/App.tsx`), no lazy shell wraps a lazy page, there is
exactly one route-level Suspense boundary (`src/AuthenticatedShell.tsx`), and
`src/test/shellCoreSynchronous.test.ts` fails the build if either invariant
regresses. Optional heavy features (tour overlay, assistant panel) load on
demand with `null` fallbacks and cannot suspend route content.

Verdict: **AURA_SUSPENSE_RETRY_CLOSED** (dev lane, 80/80).

## 3. Still open - 3D reference facility

The route now commits, so the previous blocker is gone, but the scene itself is
short:

- `reference-facility-regression`: expected >= 178 mounted objects, got **40**
  after a 90 s poll. The NVIDIA equipment and AURA facility families are not
  attaching; only the 40 cabinets are.
- `twin-canvas-mounting`: `twin-visualization-layout` testid never appears; the
  route renders the procedural 2D floor plan instead of the 3D layout.
- `facility-visualisation`: disclosure string drifted. UI renders
  "Procedural 2D floor plan of the modelled design"; the test expects
  "Not a validated OpenUSD stage". One of the two is wrong - the disclosure
  wording is a truth-in-UI claim and must be reconciled deliberately, not by
  editing the assertion to match.

Verdict: **AURA_NVIDIA_REFERENCE_UI_NOT_CLOSED** (new cause: attachment
shortfall, not route commit).

## 4. Fabricated data reaching live routes

Highest-severity product finding. These render as real telemetry with no flag or
disclosure gating them:

- `src/hooks/useAgentRuns.ts:76-87` - run outcome, `duration_ms` and
  `tokensUsed` are `Math.random()`, then **written to the real
  `agent_definition_runs` table** and displayed on the routed AgentDetail page.
  Fabricated data persisted as if measured.
- `src/components/data-centre-twin/domains/NetworkDomainView.tsx:26-53` - 24
  switches with random CPU/memory/temperature/uptime, reachable from
  `/data-centre-twin`.
- `src/components/dc-twin/tabs/DCSimulationTab.tsx:65-74` - PUE, GPU
  utilisation, thermal/power reliability are `sin() + Math.random()` waveforms
  presented as simulation output.
- `src/components/data-centre-twin/overview/CompactRackOverview.tsx:35`,
  `EnhancedRackOverview.tsx:56,73` - random outlet temperature and cooling zone.
- `src/pages/SystemManage.tsx:59,68` - hardcoded `department: 'Operations'` and
  `roi: 0` shipped as KPI values.

This contradicts the operating-state/provenance model the platform advertises.

## 5. Duplication and dead code

- Six dashboard implementations; only `CommandCentre`, `IntelligenceDashboard`
  and `DataCentreDashboard` are routed.
- Seven simulation panels; `DCSimulationPanel` and `ScenarioSimulationPanel`
  duplicate run-id generation instead of sharing a util.
- Six assistant panel implementations; `src/components/CoPilotDrawer.tsx`
  (44.5 KB) has zero importers.
- RESOLVED (2026-08-18): 110 unreferenced modules deleted (~950 KB source),
  including `CoPilotDrawer.tsx`, `rag/RAGPanel.tsx`, the `aoc/*` panel family,
  the retired builder step/marketplace components and
  `lib/generators/mockSimulationData.ts`. Test files that only covered deleted
  modules were removed with them; `twins/dataCenter/omniverseAdapter.ts` was
  retained because the Omniverse Kit runtime contract tests depend on it.
  Verification: tsgo clean, 1897 tests pass, production build succeeds.
  Entry chunk unchanged (1,841 KB / 474 KB gzip) — the dead modules were
  already tree-shaken out, so this is a maintenance win, not a size win.

## 6. Stubbed features presented as available - RESOLVED 2026-08-18

- SSO: Google is now a real `signInWithOAuth` flow with the provider enabled on
  the backend and a `/auth/callback` route (`src/auth/ssoProviders.ts`,
  `src/pages/auth/AuthCallback.tsx`). Microsoft and SAML enterprise SSO render
  disabled with a stated reason instead of a "coming soon" toast. Guarded by
  `src/auth/__tests__/ssoProviders.test.ts`.
- Notification settings: backed by `public.notification_preferences`
  (owner-only RLS, GRANTs applied) via `useNotificationPreferences`; the copy
  now states that email delivery is not configured.
- Data trust: `DataTrustStrip` accepts `state={null}` and renders an explicit
  "metrics not available" panel. `IntelligenceDashboard` no longer passes the
  fabricated 412/438 sensor counts.

## 7. Bundle

Entry chunk 1,840 KB raw / 474 KB gzip. Route chunks correctly isolated
(vendor-3d 898 KB, Builder 561 KB, vendor-charts 433 KB, Marketplace 179 KB).
Entry grew ~40 KB gzip when the shell became synchronous; splitting the tour
(101 KB) and assistant recovered part of that. Deleting the dead modules in
section 5 is the next available reduction.

## 8. Security

0 critical. 5 warnings, none newly introduced: two Supabase linter
SECURITY DEFINER exposure warnings (one already user-ignored),
`connection_credential_events` having no tenant read path (fail-closed by
design), `team_invites` authorising on `profiles.email` rather than a verified
address, and `agent_definitions` lacking the org-sharing policy its sibling
`agents` table has. The `team_invites` one is the only genuine logic weakness:
a user who edits their profile email to a pending invitee address can read that
invite row.

## Recommended order of work

1. Fabricated telemetry on live routes (section 4) - truth violation, and one
   case writes fake rows to the database.
2. Reference facility attachment shortfall and the disclosure-string conflict
   (section 3).
3. `team_invites` email authorisation (section 8).
4. Dead code and duplicate-surface deletion (section 5).
5. Stubbed SSO/notification affordances - either implement or remove the
   buttons (section 6).

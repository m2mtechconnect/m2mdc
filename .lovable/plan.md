# AURA DC frontend remediation — prioritized from the route audit

Audit-only findings are already reported. This plan is the remediation backlog, ordered by
customer-visible risk. Nothing here has been applied.

## P0 — Customer-visible contradictions with the current product

### 1. Remove the Zapier surface from Builder
`/builder` Step 3 renders a Zapier OAuth flow that is not part of the Connections control plane.
- `src/components/builder/ConnectStep.tsx` -> `BuilderIntegrationsHub.tsx` -> `ZapierIntegrationCard.tsx`
- Delete `ZapierIntegrationCard`, the `zapier-integration-status` / `zapier-oauth-connect` /
  `zapier-test-connection` client calls and `hooks/useTokenRefresh.ts` Zapier branch.
- Replace Step 3 with a read-only summary of connections already established at
  `/manage/integrations`, plus a link out. Builder must not mint credentials.
- Drop `zapier` from `src/types/integrations.ts` and the `en.ts` / `fr.ts` strings.
- Delete orphans `components/HealthCheck.tsx`, `components/HealthBadges.tsx`.

### 2. Collapse the duplicate Builder wizards
`src/pages/Builder.tsx:187` picks between two complete 5-step wizards at runtime.
- Keep the DC wizard (`components/builder/dc-steps/*`, `useDCTwinBuilderStore`), which matches the
  Data Centre master template.
- Delete `components/builder/steps/Step1Summary..Step5Deploy` and `useWizardBuilderStore`, and make
  `/builder` render the DC wizard unconditionally regardless of the `fromScanner` flag.
- Delete the third, entirely unreferenced copy `components/builder/steps/DCStep1..5*.tsx` — this is
  where the raw `Endpoint URL` / `Bearer Token` / `API Key` form lives, so removing it also removes
  the re-wiring landmine.
- Fold `components/builder/step5/` into the surviving step directory so there is one naming scheme.

### 3. Un-ship the demo page
`/digital-twins-demo/funding-intake` (`AuthenticatedShell.tsx:142`) has no DEV gate and no role
guard. Delete the route and `pages/FundingIntakeDemo.tsx`.
Gate `/twin-debug` behind `import.meta.env.DEV` in addition to `AdminRouteGuard`.

### 4. Status labels must be evidence-backed
- `CompactEventTimeline.tsx:64`: replace the literal `badge="Live"` with the run/provenance mode
  already available on the event stream, or drop the badge.
- `AdminSignupsDashboard.tsx:139-140`: either subscribe to realtime and keep "Live", or relabel to
  the last-refreshed timestamp.
- Add a lint/test rule extending `src/test/whiteLabelSurfaces.test.ts` that fails on literal
  `Live` / `Connected` / `Healthy` / `Deployed` badge props.

## P1 — Duplicate information architecture

### 5. Retire `/marketplace`
`pages/Marketplace.tsx` and `components/marketplace/*` are a second "connect things" surface with no
import overlap with `src/connections/*`. Move template browsing into the Connections catalogue tab
and redirect `/marketplace` -> `/manage/integrations?tab=catalogue` via `routeAliases.ts`.
Delete the unreachable `McpGrid.tsx`, `McpServerPreviewModal.tsx`, `MCPToolsPlayground.tsx` and the
Zapier branch of `lib/marketplaceNormalizer.ts`.

### 6. Decide the end-user MCP surface
`SystemDetailsDrawer` mounts `AgentPlayground` + `AgentMCPServers` on `/app/agents`. Either scope it
to internal roles, or restate it as an agent tool inspector without raw server registration.

### 7. Resolve the twin route overlap
`/data-centre-twin(/:id)` and `/blueprint/:id` render different components for the same concept, and
`/data-centre-twin` also names a distinct public page. Make the authenticated paths redirect to
`/blueprint/:id`, and rename the public one to `/twin-preview`-style naming.
Remove the redundant `/dsx/evidence-beta/overview` duplicate of the index route.

## P2 — Provider neutrality and design-system consistency

### 8. Provider-neutral intelligence profiles
`ModelMarketplace.tsx` and `Step2Intelligence.tsx` expose `openai/gpt-5`,
`anthropic/claude-sonnet-4-5`, Gemini IDs and vendor logos; `/settings/ai` exposes `gemini-1.5-pro`.
Introduce named profiles (for example Fast / Balanced / Deep Reasoning) resolved to concrete models
server-side, and remove vendor logos and raw model IDs from customer-facing pages. Keep raw model
selection only under `/admin/*`.

### 9. Brand cleanup
- `AuraLogo.tsx`: replace the `NVIDIA_GREEN` constant with an AURA technical-accent design token of
  the same value, so the logo does not carry a vendor-named constant.
- `DCArchitectureDiagram.tsx` and `InfrastructurePage.tsx`: drive hardware names from the blueprint
  inventory instead of hardcoded "NVIDIA H100 Fleet" / "B3100" copy.
- `validation/cloudGpu/baselineSnapshot.ts`: move the `m2mdc.lovable.app` value behind the release
  metadata already used by `/help`.

### 10. Page header and token compliance
Only 3 of 37 pages use `CommandHeader` + `PagePurpose`. Roll the Connections pattern out across
authenticated pages, starting with the highest-traffic offenders, and replace hardcoded utilities:
`TwinPreview.tsx:182,204,447,459`, `account/Profile.tsx:282-284`,
`AdminSignupsDashboard.tsx:234`, `admin/AssetPreview.tsx:87`.
Convert `InfrastructurePage.tsx` from raw `Card` to the shared `Panel` / `Instrument` primitives.

## Technical notes
- All 30 entries in `config/routeAliases.ts` already resolve through `PreserveNavigate`; no alias
  renders a legacy screen, so no alias work is required beyond adding the `/marketplace` entry.
- `PARAM_ALIASES` is never mounted as a route. Either mount it or move it into the test fixtures it
  actually serves.
- Duplicate `/sign-out`, `/invite/accept` and `*` declarations are intentional: each resolves in a
  distinct auth state (public / pending-approval / approved-internal / pilot). Leave them.
- Verification per phase: `bunx tsgo --noEmit`, the existing route-stress and deep-link Playwright
  configs, and `src/test/whiteLabelSurfaces.test.ts`.

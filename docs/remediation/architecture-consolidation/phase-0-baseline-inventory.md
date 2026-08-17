# AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT

## Phase 0 - baseline and inventory

Baseline taken on a clean working tree. Scripts available: `typecheck`, `lint`,
`test`, `test:e2e`. One pre-existing typecheck error in
`src/test/whiteLabelSurfaces.test.ts:52` (filter parameter inferred as `never`).

### Truth sources found for the same question

| Question | Sources found | Canonical after Phase 1 |
| --- | --- | --- |
| What is NVIDIA-integrated / SimReady / OpenUSD-backed? | `src/config/dsxCapabilityRegistry.ts`, `src/capabilities/registry.ts`, `src/components/integrations/NvidiaDsxReadinessPanel.tsx`, `src/pages/admin/PlatformReadiness.tsx` | `src/config/dsxCapabilityRegistry.ts` |
| Coarse UI capability gates | `src/capabilities/registry.ts` | same file, now fully derived from the canonical registry |
| Simulation execution | `src/simulation/SimulationEngine.ts`, `src/simulation/providers/*`, `src/workspace/scenarioEngine.ts`, `src/simulation/compat/*`, `src/twins/sovereignDataCenter/*` | `src/simulation/api.ts` facade + provider registry (Phase 3, open) |
| Route destinations | `src/AuthenticatedShell.tsx`, `src/config/routeAliases.ts` | already consolidated in AURA_IA_DUP_CLEANUP |

### Integration reality check

NVIDIA-integrated capabilities: **0**. SimReady-validated assets: **0**.
NVIDIA-runtime-mounted OpenUSD stages: **0**. Live telemetry sources: **0**.
AURA-authored OpenUSD canonical capabilities: **3** (facility blueprint, asset
pipeline, SimReady validation lane). The platform is an AURA-native
deterministic simulation and evidence system that is DSX-*aligned*, not
DSX-integrated.

## Phase 1 - one capability source of truth (done)

- `src/capabilities/registry.ts` no longer hardcodes NVIDIA, OpenUSD, SimReady,
  DSX Exchange or live-telemetry facts. Every gate and every number in
  `NVIDIA_READINESS` is computed from `DSX_CAPABILITIES`. A claim can now only
  move by editing an evidence-gated registry record that `validateCapability`
  accepts.
- `NvidiaDsxReadinessPanel` rows are derived from those gates instead of a
  parallel hardcoded table. The "OpenUSD stage" row no longer states that no
  OpenUSD stage has been authored; it states the truthful position: AURA
  authors canonical masters, no NVIDIA runtime resolves them.
- `NVIDIA_READINESS.pilotReadinessPercent` is now the share of registry records
  carrying a validation method and date, instead of a static 24.
- French footer label "Scène Omniverse en direct" corrected to "Aperçu du
  jumeau AURA": the surface is the AURA Web Runtime and it is not live.

### Retired / merged surfaces

Nothing user-facing was removed in Phase 1. The readiness table keeps the same
rows and `data-testid` values; only their source of truth changed.

## Phase 3 - simulation engine and provider consolidation (done)

- `src/simulation/engineRegistry.ts` is the declared inventory of every
  execution path in the repository: 13 modules, each with a status
  (`canonical` or `frozen`), an execution class, its consumers and its
  migration target. Frozen paths accept bug fixes only; new behaviour goes
  behind the `src/simulation/api.ts` facade.
- `src/simulation/__tests__/engineConsolidation.test.ts` turns
  "do not add another simulation engine" into a failing test: any new
  `*Engine.ts` / `simulationEngine.ts` module under `src/` that is not
  declared in the registry breaks the build.
- Provider taxonomy corrected. `SimulationProviderId` now carries
  `nvidia-dsx-sim` and `specialist-solver`; `omniverse` remains registered as
  a deprecated naming alias so existing configuration keeps resolving to the
  same disabled stub. Nothing was renamed away from a user.
- Every provider now declares `executionClass` and `nvidiaIntegrated`.
  Compatibility is `aura-deterministic`, the scenario library is
  `fixture-preview`, and the NVIDIA/specialist boundary is `nvidia-dsx-sim`
  with `nvidiaIntegrated: false`. The guard test asserts no provider claims
  NVIDIA execution or live data, and that all three NVIDIA-boundary ids return
  `disabled` outcomes with `provenance: 'unavailable'`.

### Retired / merged surfaces

None. Phase 3 changed classification and guards only; no run path, route or
user-facing behaviour was removed.

## Phase 5 - renderer interface modes (done)

- `src/renderer/rendererModes.ts` is the single source of truth for how AURA
  puts a twin on screen. Three declared modes: `aura-web-runtime` (WebGL2,
  GLB derivatives of the OpenUSD masters), `aura-2d-fallback` (deterministic
  plan view) and `nvidia-kit-stream` (Omniverse Kit / RTX pixel stream).
- `resolveRendererMode()` picks the mode from real browser capability, and
  `resolveKitStreamState()` derives NVIDIA stream availability from
  `readKitConfig()`. Kit is typed-unavailable in every build variant, so the
  resolver fails closed to the AURA Web Runtime with a stated reason.
- `src/renderer/__tests__/rendererModes.test.ts` asserts that no AURA renderer
  carries an NVIDIA product name in its label, that the Kit mode stays
  unavailable with an explanation, and that WebGL2 loss routes to the 2D plan
  view rather than a blank canvas.
- Wired: the twin preview header now shows "Renderer: AURA Web Runtime" from
  the registry instead of prose, and `OmniverseStreamViewer` takes its
  connect gate from `resolveKitStreamState()` rather than re-deriving config.

### Retired / merged surfaces

None. Phase 5 replaced three independent renderer-naming decisions with one
resolver. No route or rendering behaviour changed.

## Open phases

4. Migrate the two frozen compat engines and the builder preview estimator
   onto the facade.
6. DSX Exchange boundary naming audit for MQTT surfaces.
7. AI agent positioning audit (no NIM claims).
8. Data-mode contract enforcement across every KPI surface.
## Phase 4 - compat engines behind the facade (complete)

- Added `src/simulation/compat/facadeBridge.ts`: the only sanctioned way to
  reach the frozen compatibility engines. Returns `ProviderOutcome` envelopes
  with `provenance: 'simulated'`, `providerId: 'compatibility'` and execution
  class `aura-deterministic`; a thrown engine error becomes a typed
  `error`/`unavailable` outcome instead of crashing a render.
- Migrated the one live consumer, `useSovereignDCTwin.ts`, off the direct
  engine import. It now branches on `outcome.kind` and exits the simulating
  state cleanly on failure.
- `src/twins/dataCenter/index.ts` retains a barrel re-export only; there is no
  remaining UI consumer of the legacy data-centre engine.
- `engineRegistry.ts` records the bridge as canonical and repoints the frozen
  engines' `migrationTarget` at it.
- Guard: `src/simulation/compat/__tests__/facadeBridge.test.ts` fails if any
  app module re-acquires a direct import of the frozen sovereign engine.

## Phase 5 addendum - route naming

`/omniverse-scene` was renamed to `/twin-preview` (page file
`src/pages/TwinPreview.tsx`), with a preserving redirect registered in
`ROUTE_ALIASES` and in the unauthenticated router.

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

## Open phases

4. Migrate the two frozen compat engines and the builder preview estimator
   onto the facade.
5. Renderer interface modes (AURA Web Runtime vs future Kit/RTX session).
6. DSX Exchange boundary naming audit for MQTT surfaces.
7. AI agent positioning audit (no NIM claims).
8. Data-mode contract enforcement across every KPI surface.
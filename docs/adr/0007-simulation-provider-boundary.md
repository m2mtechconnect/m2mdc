# ADR-0007: Simulation provider boundary

Status: Accepted (Phase 1B.1) with revisions — see §Revisions.
Supersedes the deferred parts of ADR-0001.

## Context

Seven simulation implementations (~5,198 LOC) coexist. Three of them
(`src/simulation/SimulationEngine.ts`, `src/twins/dataCenter/simulationEngine.ts`,
`src/twins/sovereignDataCenter/simulationEngine.ts`) independently compute
overlapping KPI shapes. `enhancedSimulationEngine.ts` (787 LOC) hosts a
parallel scenario library. The builder wizard's local `SimulationEngine` class
creates a name clash with the core engine and forces `instanceof`-based
dispatch in `SimulationDashboard.tsx`.

Consumers are scattered across dashboards, hooks, exporters, and the CoPilot.
Any single-file "one big engine" refactor would either break these consumers
or freeze the shape of a future NVIDIA Omniverse / DSX provider.

ADR-0006 established that every UI-visible metric must be a
`ProvenancedMetric<T>` and that fail-closed validation is the only path to
`provenance = 'live'`. The simulation layer must not undermine that guarantee.

## Decision

Adopt a **provider boundary**:

1. One public facade: `src/simulation/api.ts` exposes `runScenario`,
   `subscribeSimulation`, `stopSimulation`, `listScenarios`.
2. Multiple providers implementing a shared `SimulationProvider` interface:
   `demo-rules`, `scenario-library`, `blueprint`, and (stub) `omniverse`.
3. Provider selection via `VITE_AURA_SIM_PROVIDER`, defaulting to
   `demo-rules`. Unknown values fail closed.
4. Provider output is validated by a Zod schema at the facade boundary. Any
   scalar surfaced from a provider must be a `ProvenancedMetric<T>`; missing
   provenance yields `unavailable`, never `live`.
5. The `omniverse` provider is present but throws `NotImplemented`. Its
   existence does **not** constitute a live NVIDIA integration.

## Revisions (Phase 1B.1)

- **Omniverse provider does NOT throw.** Item 5 above is superseded: the
  provider is config-gated and returns typed `disabled` (default) or
  `not-implemented` (when `VITE_AURA_OMNIVERSE_PROVIDER=enabled`) outcomes.
  All outcomes carry `provenance: 'unavailable'`, so UI code can never
  fabricate a value from this provider. This preserves fail-closed
  semantics without exposing UI code to raised exceptions.
- **Discriminated outcome envelope.** The provider return type is now a
  `ProviderOutcome<T>` discriminated union with kinds
  `ok | disabled | not-implemented | unavailable | cancelled | invalid-input | error`.
  `ok` values are restricted at the type level to `provenance ∈ {simulated, demo}`;
  all non-`ok` outcomes are restricted to `provenance: 'unavailable'`.
  `assertOutcomeIntegrity` enforces this at runtime so a JS caller cannot
  smuggle a live-tagged value past the facade.
- **Facade never throws.** Errors raised inside a provider are converted
  to sanitized `kind: 'error'` outcomes (message truncated to 200 chars,
  no stack).
- **No consumer migration in this slice.** `src/simulation/index.ts` is
  unchanged; the facade is opt-in via `src/simulation/api.ts` and today
  only the contract tests exercise it.
6. `twins/dataCenter` and `twins/sovereignDataCenter` retain their public
   exports through `src/simulation/compat/*` re-export modules. Consumer
   codemods happen in one dedicated slice.
7. The builder's local `SimulationEngine` class is renamed to eliminate the
   name clash; `MockSimulationEngine` moves to `src/simulation/fixtures/`.

## Invariants preserved

- Deterministic demo output (seeded PRNG from Phase 1A).
- Metric-level provenance and staleness rules (ADR-0004, ADR-0006).
- Export schema (`src/lib/provenance/exporters/**`).
- Compatibility of `useSimulation`, `useEnhancedSimulation`,
  `useSovereignDCTwin`, `useOmniverseKit`, `useTwinKPIsFromSimulation`
  hook signatures.
- Truth-in-UI classifications registered in Phase 1A.3.

## Consequences

- Consumers stop importing engine internals; they depend on `api.ts` only.
- Provider addition (e.g. real Kit / DSX in a later phase) is a new file plus
  a flag value — no consumer changes.
- Deletion of duplicate engines becomes a mechanical step behind
  characterization tests (Slice 1B.6).
- Any future claim of "live" simulation requires (a) provider output that
  validates against the Zod schema and (b) provenance = `live` per ADR-0006.

## Alternatives considered

- **One monolithic engine**: rejected — freezes the shape and blocks a future
  DSX provider without another refactor.
- **Keep the status quo**: rejected — Phase 0 audit findings on duplicated
  KPI logic and name-clashed classes remain unresolved.
- **Delete duplicates first, refactor later**: rejected — no characterization
  tests cover `enhancedSimulationEngine`, so deletion risk is unbounded.

## References

- ADR-0001 (simulation consolidation — deferred parts).
- ADR-0004 (data provenance model).
- ADR-0006 (truth-in-UI and metric provenance).
- `docs/remediation/phase-1b-consolidation-design.md`.
- `docs/remediation/phase-1b-plan.md`.
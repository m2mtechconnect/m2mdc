# ADR-0004: Canonical DataProvenance model

Status: Accepted (Phase 1A).

## Context

Phase 0 confirmed 222 `Math.random()` lines across simulation/twin/engine/sovereignty code with the output presented in the UI as if it were live operational data. The audit required a single, enforced provenance model so no UI surface can label a synthesized value as live.

## Decision

Single vocabulary defined in `src/lib/provenance/types.ts`:

```ts
type DataProvenance =
  | 'live'         // Directly from a validated external source, non-stale.
  | 'derived'      // Computed exclusively from validated `live` inputs.
  | 'simulated'    // Produced by a scenario simulation run.
  | 'demo'         // Produced by synth* helpers / demo fixtures.
  | 'static'       // Configured target / benchmark.
  | 'unavailable'; // Missing, invalid, stale, or unreachable source.
```

Rules:

1. Values passed through from a validated Kit response may be `live`.
2. Values calculated exclusively from `live` inputs may be `derived`.
3. Values produced by any `synth*`/`build*` helper or demo fixture must be `demo`.
4. Configured targets, thresholds, and benchmarks are `static`.
5. Scenario simulation results are `simulated`.
6. Invalid, missing, or stale sources are `unavailable`.
7. **Missing provenance defaults to `unavailable`, never `live`.** Enforced by `getProvenance()` and the `UNAVAILABLE_META` constant.

### Wire format

`FacilityProvenanceMap` covers every top-level section a UI surface reads from `DataCentreFacility`: `facility`, `pue`, `totalPower`, `gpuUtilization`, `thermal`, `cooling`, `network`, `facilitySafety`, `sovereignty`, `carbon`, `auditReadiness`, `alerts`, `timeSeries`.

### Enforcement (Phase 1A)

- `kitStatusToFacilityWithProvenance()` returns both the facility and the map.
- `demoFacilityProvenance()` returns a map for the mock-data path, marking every section `demo` or `unavailable`.
- `derivedFrom()` refuses to upgrade a non-`live` source to `derived`.
- `ProvenanceBadge` and `StreamStatusBanner` render the vocabulary uniformly.

### Enforcement (Phase 1B, not this phase)

- Codemod every dashboard KPI to consume a `ProvenanceMeta` and render `<ProvenanceBadge>`.
- Add an ESLint rule (or unit test) forbidding rendered KPIs that lack a provenance prop.

## Consequences

UI surfaces that have not yet been retrofitted with the badge continue to work — they just miss the provenance UX. No API break.
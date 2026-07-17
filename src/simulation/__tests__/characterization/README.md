# Phase 1B.2 — Engine Characterization Tests

**Purpose.** Pin the *current* observable behaviour of the seven
simulation engines identified in
`docs/remediation/phase-1b-consolidation-design.md` so that the deletions
and folds scoped for slices 1B.4 → 1B.7 have an equivalence gate.

**Discipline (read-only).** These tests document what each engine
*actually* produces today. They must not assert intended future
behaviour, and they must not touch any engine source file. When an
engine's current output is non-deterministic, the test either

- pins the shape (keys, types, cardinality bounds) rather than exact
  values, or
- stubs `Math.random` / fake timers to make the sequence reproducible
  within the test only.

**Coverage checklist per engine.**

| Coverage | What we assert |
|---|---|
| Typed outcome | Return / event shape (keys, discriminants, string enums). |
| Provenance | Whether the engine declares provenance at all today. Absence is a fact worth pinning; several class-based engines emit raw `data` with no provenance tag, which is exactly why the facade wraps them. |
| Cancellation | How the engine reacts to `pause`, `stop`, or `reset` after start; whether emissions stop and internal counters reset. |

**Files.**

| File | Engine under test | Kind |
|---|---|---|
| `simulationEngine.canonical.spec.ts` | `src/simulation/SimulationEngine.ts` | class, tick-driven (`setInterval`) |
| `generateSimulationResult.spec.ts` | `src/simulation/generateSimulationResult.ts` | pure function, completion-time summary |
| `dataCenter.simulationEngine.spec.ts` | `src/twins/dataCenter/simulationEngine.ts` | pure functions, deterministic-per-time |
| `sovereign.simulationEngine.spec.ts` | `src/twins/sovereignDataCenter/simulationEngine.ts` | pure function, switch-based |
| `sovereign.enhancedSimulationEngine.spec.ts` | `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` (`EnhancedSimulationRunner`) | class, tick-driven (`window.setInterval`) |
| `builder.simulationEngine.spec.ts` | `src/components/builder/step5/SimulationEngine.ts` | class, tick-driven, workflow-random |
| `builder.mockSimulationEngine.spec.ts` | `src/components/builder/step5/MockSimulationEngine.ts` | class, tick-driven, config-scripted |

No engine source is modified by this slice.
# Phase 2 - Canonical Simulation Architecture

Scope: create one real `SimulationOrchestrator` that is the only supported
entry point for starting simulation or preview execution. No routes, Edge
Functions, tables, migrations, assets, compatibility engines or provider files
were deleted in this phase.

## What was built

| Module | Responsibility |
| --- | --- |
| `src/simulation/orchestrator/executionClass.ts` | The mandated execution taxonomy and its type guard |
| `src/simulation/orchestrator/prng.ts` | `mulberry32-v1` seeded generator, FNV-1a seed derivation, UUID-backed identifiers |
| `src/simulation/orchestrator/canonical.ts` | Deterministic serialization and SHA-256 hashing of inputs and outputs |
| `src/simulation/orchestrator/types.ts` | One request type, one outcome type, one provenance record, one provider interface |
| `src/simulation/orchestrator/orchestrator.ts` | Validation, provider selection, readiness enforcement, seeding, execution, response validation, provenance |
| `src/simulation/orchestrator/index.ts` | The default registry and the process-wide `simulationOrchestrator` |

## Registered providers

| Provider id | Execution class | Notes |
| --- | --- | --- |
| `aura-scenario` | `aura-stochastic-seeded` | Wraps the existing compatibility provider. Preview only. |
| `aura-panel-summary` | `aura-stochastic-seeded` | Wraps `generateSimulationResult`. Preview only. |
| `builder-preview-fixture` | `fixture-preview` | Scripted template playback (session provider). |
| `builder-preview-estimator` | `aura-stochastic-seeded` | Synthetic tick estimator (session provider). |
| `nvidia-solver` | `nvidia-solver` | Fail-closed. `readiness()` is false in every build. |
| `external-solver` | `external-solver` | Fail-closed. `readiness()` is false in every build. |

## Guarantees now enforced in code

- **Single entry point.** `previewSessionBridge`, `simulation/api.ts` and
  `useSimulationCompletion` all dispatch through the orchestrator. No module
  outside the orchestrator's own providers constructs an engine.
- **Refusal over fabrication.** An unknown, unready, or misdeclared provider
  yields a typed `failed` outcome whose provenance records execution class
  `unavailable` and a null output hash. Nothing falls back to an AURA engine.
- **No browser-authored authority.** A browser-runtime provider can never
  serve `intent: 'authoritative'`, regardless of what it declares.
- **External claims must be externally backed.** A provider that declares
  `requiresExternalRuntime` and returns no external job id is rejected as a
  contract violation, so an NVIDIA attribution cannot be produced locally.
- **Recorded determinism.** Seeded providers receive their generator from the
  orchestrator; the seed and `mulberry32-v1` are written to provenance. A
  provider that declares itself deterministic throws if it draws a number.
- **No unseeded randomness.** `Math.random()` is gone from `src/simulation` and
  `src/components/builder/step5`. Identifier generation uses `crypto.randomUUID`.

## Corrections to prior claims

- The builder estimator path was labelled `aura-deterministic`. It draws from a
  PRNG, so it is now `aura-stochastic-seeded` with a recorded seed.
- `generateSimulationResult` was documented as deterministic while calling
  `Math.random()`. It is now seeded and dispatched as a seeded provider.
- `createSimulationRun` reported a random `durationMs` between 1s and 4s that
  read as a measured elapsed time. It now reports `0`.

## Enforcement

- ESLint `no-restricted-imports` blocks direct engine imports outside the
  orchestrator (`eslint.config.js`).
- `src/simulation/orchestrator/__tests__/bypassGuard.test.ts` re-checks the same
  invariants at the source level in CI, plus the no-`Math.random()` rule.
- `src/simulation/orchestrator/__tests__/orchestrator.test.ts` covers the
  behavioural contract above (14 cases).

## Not done in this phase

Phases 3-10 remain untouched: no route, table, Edge Function or asset removal,
no server-side run execution, and no real NVIDIA runtime integration. The
`nvidia-solver` provider stays fail-closed until a server-mediated endpoint
exists.
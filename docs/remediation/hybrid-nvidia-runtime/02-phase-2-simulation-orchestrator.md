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
---

## Phase 2 closure verification (correction pass)

### 1. Execution duration
Timing is measured centrally by `src/simulation/orchestrator/timing.ts` using a
monotonic clock, with wall-clock `startedAt` / `completedAt` recorded separately.
Providers return only `{ value, externalJobId }`, so a provider-supplied duration
is structurally impossible. Unmeasurable intervals are `null` with
`durationSource: 'unavailable'` - never `0`. Legacy sovereign `SimulationRun`
records now carry `durationMs: null`. Tests: `__tests__/duration.test.ts`.

### 2. Active consumer proof
`evidence/phase2-active-consumer-proof.md`. Four adapters dispatch execution
(`api.ts`, `facadeBridge.ts`, `previewSessionBridge.ts`, `useSimulationCompletion.ts`),
all through the orchestrator. `runSimulation` was removed from the
`twins/sovereignDataCenter` barrel, closing the last bypass surface. All
remaining engine references are type-only, documentation strings, sanctioned
adapters, or characterization specs.

### 3. Bypass guard
ESLint scope widened from `src/**` to `**/*.{ts,tsx}`; the sovereign engine and
direct provider imports are now restricted too. The CI guard scans `src/`,
`tests/`, `cypress/`, `scripts/`, `supabase/functions/` including test files,
proves a non-empty corpus, and fails on stale exemptions. Exemptions: the
orchestrator itself, the four frozen engine modules, the compat facade bridge,
and the characterization / compat / barrel specs (enumerated in both files).

### 4. PRNG qualification
`mulberry32-v1` is a fast non-cryptographic 32-bit PRNG for reproducible
scenario variation only - never for identity, tokens or security. Seeds derive
via `fnv1a-32-v1` over canonical request text; raw material, source and
derivation are recorded in provenance. A 32-bit seed collision cannot become an
identity collision: `runId` is independent, and `inputHash` / `outputHash` /
`reproducibilityHash` are SHA-256. Frozen vectors: `__tests__/prng.test.ts`.

### 5. Canonical serialization
`aura-canonical-v1` covers key ordering, Unicode NFC, `-0`, `NaN`, infinities,
`BigInt`, `Date`, `Map`/`Set`, `undefined`, functions and symbols; cyclic input
raises `CanonicalizationError` rather than hashing a partial view. Strings with
a leading `@` are escaped so no literal can spoof a type tag. Both schema
versions appear in provenance and in `reproducibilityHash`, which excludes
timestamps and run IDs. Tests: `__tests__/canonical.test.ts` (21 cases).

### 6. Failure provenance
Failures retain `requestedProviderId` and `requestedExecutionClass` alongside
the actual outcome, plus structured `failureCode` / `failureMessage`. Refused
NVIDIA and external runs never fabricate an `externalJobId` or `outputHash`.
Tests: `__tests__/failureProvenance.test.ts`.

### 7. Singleton and concurrency safety
The singleton retains provider registration only. Registration is idempotent and
rejects conflicting re-registration. Concurrent runs keep independent seeds,
hashes, tenancy and failures; separate instances reproduce identical hashes with
distinct run IDs. Tests: `__tests__/concurrency.test.ts`.

### 8. Repository gates
- Typecheck: 0 errors (`evidence/phase2-typecheck.log`)
- Lint: 0 errors, 1347 warnings - exactly the agreed baseline (`evidence/phase2-lint.log`)
- Tests: 1910 passed, 91 skipped, 0 failed (`evidence/phase2-tests.log`)

## Verdict

**PHASE_2_CLOSED**

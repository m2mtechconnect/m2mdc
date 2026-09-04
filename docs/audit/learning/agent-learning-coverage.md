# AURA Super-Agent Learning Coverage

Status: inventory only, no runtime or production change
Inventory date: 2026-09-04
Reviewed base commit: `7441ac3a03da926383830afad428a868d9d8bd30`
The implementation checkpoint is the current commit on this feature branch;
resolve it with `git rev-parse HEAD` when producing release evidence.

## What is currently encoded

The repository now contains twelve active reviewed lessons and twenty-one
synthetic truth-evaluation cases. The current lessons cover:

| Mechanism | Lesson/evaluation coverage | Status |
| --- | --- | --- |
| Viewport claims must use a complete canonical tuple | `viewport-evidence-exact-tuple.v1`; four viewport cases | Covered |
| Client run IDs are untrusted locators | `run-id-untrusted-locator.v1`; four provenance cases | Covered |
| Ref-bearing components must be transparent | `ref-transparency-dev-instrumentation.v1`; lesson-integrity case | Covered |
| Vendor instrumentation activation must be explicit | `dev-instrumentation-activation-parity.v1`; lesson-integrity case | Covered |
| Release workflow shell must match runner semantics | `release-workflow-shell-syntax-parity.v1`; lesson-integrity case | Covered |
| Auth email provider callbacks are signed webhooks | `auth-email-hook-signed-webhook.v1`; lesson-integrity case plus perimeter contract tests | Covered |
| Physics-ML/NVIDIA claims require exact runtime evidence | `physics-model-claim-grounding.v1`; lesson-integrity case plus claims policy | Covered |
| Frontend actions must reach canonical backend contracts | `frontend-backend-api-contract.v1`; end-to-end wiring lesson-integrity case | Partially covered |
| Synthetic fixtures must remain outside operational truth | `fixture-isolation-and-provenance.v1`; provenance lesson-integrity case | Partially covered |
| Qualification artifacts must bind to an exact candidate SHA | `artifact-sha-provenance.v1`; evidence lesson-integrity case | Partially covered |
| Tenant authority must follow caller identity and RLS | `tenant-rls-caller-boundary.v1`; boundary lesson-integrity case | Partially covered |
| Physics-ML models require reproducible qualification evidence | `physics-model-qualification.v1`; model-card lesson-integrity case | Partially covered |

These are governed retrieval and regression controls. They are not model-weight
training and do not authorize autonomous code, prompt, policy, or production
configuration changes.

## Required coverage still missing or incomplete

| Historical failure class | Current evidence | Required learning control | Status |
| --- | --- | --- | --- |
| `auth-email-hook` production-perimeter classification | Signed-webhook disposition, implementation ordering, contract tests, lesson/truth pair, and the local PR-0.1 verifier pass at the current branch checkpoint | Fresh exact-head CI/deployed perimeter evidence and provider callback observation | Partially covered |
| Frontend/backend API contract drift | Individual route/API tests, the authenticated-QA harness contract, a guarded persisted-run browser journey and the new lesson/truth pair exist | Execute one authenticated end-to-end case from UI action through persisted response | Partially covered |
| Fixture leakage into operational surfaces | Fixture labels, provenance tests, and the new lesson/truth pair exist | Cross-route regression cases proving fixture data cannot appear as live data | Partially covered |
| Artifact and release-evidence preservation | Artifact/fingerprint checks and the new lesson/truth pair exist | Case that fails when evidence is stale, missing, or from a different SHA | Partially covered |
| Tenant/RLS/caller-boundary regressions | Security tests, policy documents, and the new lesson/truth pair exist | Authenticated cross-tenant cases covering caller identity, active organization and RLS | Partially covered |
| Unsupported NVIDIA/USD/physics claims | Capability registry, reference-only manifest, claim policy, and the lesson/truth pair exist | Claim-grounding cases for unavailable runtime, model, dataset, and validation states | Partially covered |
| PhysicsNeMo model qualification | Qualification lesson now exists; no AURA model or runtime is present | Model card, dataset provenance, held-out accuracy, calibration, fallback and reproducibility evaluations | Partially covered |

## Qualification rule

No learning or policy change is qualified until every applicable mandatory gate
is green on the same exact candidate SHA. Missing, skipped, cancelled, blocked,
or unavailable results remain unverified and block promotion.

The targeted learning tests pass in the authorized repository environment. The
initial sandbox attempt hit an environment access error while resolving the
Vitest/esbuild dependency links; no test was bypassed or weakened. The broader
qualification matrix still requires fresh exact-head evidence for the remaining
coverage classes below.

Current execution evidence is explicit: the focused governed-learning,
truth, Phase 1 vertical-slice, authenticated-QA-harness and unit-runner
contracts pass at 133/133 (105 prior contracts, 11 vertical-slice/persistence
tests, 5 harness-boundary tests and 2 deterministic-runner tests). The prior
parallel full unit surface reported 2,864/2,875 passed; the eleven failures
were the two builder URL-contract tests, eight builder-store tests and one
legacy simulation-export test. A complete serial run of the same unit surface
now passes 289/289 files and 2,883/2,883 tests. The standard `test:unit` and
`test:unit:coverage` commands now enforce that deterministic isolation mode,
so the known runner-contention failure does not recur in the release gate.
Ad-hoc parallel Vitest runs remain an unqualified developer convenience and
must not be used as release evidence.

## Next controlled action

The second atomic lesson/evaluation update and the first vertical-slice
repository contract are complete: auth-email-hook,
physics/NVIDIA claims, UI/API wiring, fixture isolation, artifact/SHA
provenance, tenant boundaries, and PhysicsNeMo qualification are now encoded;
tenant preflight, lifecycle, decision, reload and export boundaries are covered
by focused tests. The remaining work is implementation and
evidence: run authenticated end-to-end, cross-route, exact-head artifact,
cross-tenant, visual, and model-qualification checks. Only after that evidence
is green should the end-to-end vertical slice or an isolated PhysicsNeMo worker
be promoted beyond preview.

# AURA AI Usage Controls & Model Evaluation Lab

## Baseline

This program is stacked on qualified PR #24 head `4bc84fc2abe2d5c0c6d2d72f7b3752264b350c5d`.

The provider architecture is already qualified. This program does not reopen that work and does not enable NVIDIA in production.

## Truth boundaries

- A reference/mock-data benchmark qualifies model reasoning behavior, not live-facility accuracy.
- Passing a benchmark does not prove calibrated CFD/electrical behaviour, NIM/NeMo execution, SimReady status, or production telemetry quality.
- Provider/model promotion is a human-reviewed governance action. The evaluator may recommend; it never changes production routing automatically.
- Dollar cost remains `null` unless a trusted pricing source or provider bill supplies defensible cost evidence.

## AUE-0 audit findings

- `agent-stream` used a process-local 30/hour map; multiple Edge Function instances could bypass that ceiling.
- authenticated agent preview, suggestions and model-test paths could spend model credits without one durable shared rate ledger.
- `agent_runs` is useful execution history but is not a provider-neutral quota/spend ledger.
- `public_intake_rate_limits` is intentionally not reused because its semantics are public intake, not authenticated AI spend.
- NVIDIA/AURA normalized reference records, source conflicts and scenario classifications are available for deterministic benchmarks.

## Durable usage model

`ai_usage_policies` declares operation-to-bucket policy. `agent_run`, `agent_execute`, and `agent_stream` share `agent-interactive` so alternate endpoints cannot evade the same user/tenant ceiling.

`ai_rate_limit_buckets` is atomically reserved through the service-only `reserve_ai_request` function.

`ai_usage_events` records one durable event per reserved model request with tenant/user/agent/operation/provider/model/profile/token/latency evidence. The row is created before provider inference and finalized afterwards.

All three control-plane tables are service-only. Browser clients do not query or mutate them directly.

## Evaluation roadmap

1. Build versioned golden scenarios from the pinned NVIDIA reference corpus and AURA simulation truth classes.
2. Score grounding, provenance, source-conflict handling, unavailable-data abstention, forbidden claims, schema compliance and advisory-vs-actuation safety.
3. Add shadow/model-comparison execution under a separate `model-evaluation` durable quota.
4. Record evaluation evidence without promoting a provider automatically.
5. Require human review before changing an AURA profile's production provider.

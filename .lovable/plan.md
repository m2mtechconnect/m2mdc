# Phase 1: Governed Machine Learning for the AURA Super Agent

Base commit: `ddd6b11a0185808944482c921a1445ad194e214d`. Source-only. No deployment, no publishing, no navigation change, no new globally visible page.

## Recommendation up front

**Ship code-owned contracts first. No database schema and no new API surface in Phase 1.**

Reasons:
- The two truth fixes just proven (canonical viewport tuple, server-verified run id) can be made durable today as versioned lessons plus executable eval cases in code, running inside `test:unit`. That closes the regression risk immediately, with zero backend risk.
- Every ML control we need to prove (routing provenance, redaction, promotion gates) is a pure function. Proving them as code + tests first means the later migration is written against a contract that is already qualified, not the other way round.
- A feedback/lesson schema written before the contract is settled becomes an applied migration we are not allowed to edit, and it would introduce user-content storage (the highest-risk element) before the redactor has been proven.

Risks accepted by deferring schema: no persisted feedback capture yet, lesson authorship stays a code review action rather than an in-product workflow, and the retrieval path reads from a code-owned registry rather than a table. All three are Phase 2 items and none blocks the durability objective.

## What already exists (do not rebuild)

- LLM transport: `supabase/functions/_shared/ai-client.ts` — server-owned profiles, browser cannot pick a model. `src/lib/llm/modelResolver.ts` is a client-side display/enforcement helper.
- Deterministic truth path: `supabase/functions/_shared/assistantTruth.ts` (envelope, canonical viewport surfaces, `extractCandidateRunId`, structured gate, preamble) invoked ahead of the model in `supabase/functions/copilot-stream/index.ts`.
- Per-user memory: `copilot_memory` read/write inside `copilot-stream`.
- Deterministic retrieval + guardrails + eval runner: `src/supervisor/knowledge/*`, `src/supervisor/evals/runSupervisorEngineeringEvals.ts` with `supervisor-engineering-evals.json`.
- Analytics: `src/lib/copilot/analytics.ts` writing `copilot_events`.

## What is missing (Phase 1 fills these, in code)

1. No versioned **lesson** object: the truth fixes exist only as implementation plus tests, with no reviewed, activatable, citable record.
2. No **response provenance record**: provider, model, policy version, prompt version, lesson ids, latency, tokens, truth-path vs model-path are not emitted per response.
3. No **redaction contract** for candidate feedback.
4. No **promotion contract**: baseline vs candidate, mandatory gates, thresholds, rollout/rollback metadata.

## Phase 1 scope

### A. Lesson contract and registry (new, code-owned)

`src/supervisor/learning/lessonTypes.ts`
- `AuraLesson`: `id`, `version`, `title`, `status: 'draft' | 'active' | 'retired'`, `origin: 'confirmed-miss' | 'review'`, `invariant` (the shared rule), `guidance` (the injectable text), `citations`, `dataClass: 'reviewed-lesson'`, `reviewedBy`, `reviewedAt`, `supersedes`.
- Hard rule in the type docs and enforced by the registry: a lesson may only add guidance text. It carries no code, no tool, no model selection, no policy or schema change.

`src/supervisor/learning/lessonRegistry.ts`
- Frozen array of lessons, `activeLessons()`, `lessonById()`, integrity check mirroring `verifyCorpusIntegrity` (stable hash over the frozen set).
- Seeded with exactly two lessons derived from the proven fixes:
  - `viewport-evidence-exact-tuple.v1` — viewport evidence is accepted only as a complete canonical tuple keyed by a registered surface id; mixed or unknown tuples are rejected, grounded values are copied from the registry.
  - `run-id-untrusted-locator.v1` — a client-supplied run id is a locator only; provenance requires an RLS-scoped read; `run: null` means the page shows no run, never that the database holds none.

### B. Executable evaluation cases (extend the existing runner pattern)

`src/supervisor/evals/supervisor-truth-evals.json` + `src/supervisor/evals/runSupervisorTruthEvals.ts`
- Case kinds: `viewport-claim`, `run-provenance`, `lesson-integrity`, `redaction`, `provenance-record`.
- Cases assert against the pure functions already in `assistantTruth.ts` (canonical surface acceptance/rejection, `extractCandidateRunId` malformed → null, null-run wording) plus the new modules below.
- Data class stays `synthetic-evaluation-data`; no telemetry, no tenant rows.
- Wired into `tests/unit` so `verify:fast` runs it.

### C. Response provenance record (shape only, no persistence)

`supabase/functions/_shared/responseProvenance.ts`
- `AssistantResponseProvenance`: `provider`, `model`, `modelVersion`, `policyVersion`, `promptVersion`, `lessonIds[]`, `path: 'truth' | 'model'`, `latencyMs`, `tokens?: { input?: number; output?: number }`, `limitations[]`.
- `buildResponseProvenance()` pure builder; unknown fields stay `null` and are reported as unavailable, never inferred.
- Availability rule encoded: a configured model id is not evidence the model is available, healthy or production-ready.
- `copilot-stream` change is limited to constructing this record and emitting it as one additional SSE event (`{ type: 'provenance', data }`) after the answer. No behavioral change to the truth path, no new request fields, no CORS/JWT/RLS change. Client rendering is optional and out of Phase 1.

### D. Model routing policy (provider-neutral, server-owned)

`supabase/functions/_shared/modelPolicy.ts`
- Named policies (`truth-grounding`, `general-assistant`) → a profile of `ai-client.ts`, with `policyVersion` and `promptVersion` constants.
- Resolution stays server-side; no client-supplied model id is ever read. `ai-client.ts` itself is unchanged.

### E. Feedback candidate contract (no table yet)

`src/supervisor/learning/feedbackContract.ts`
- `FeedbackCandidate`: `consent: true` required by the type, `responseProvenanceRef`, `verdict`, `redactedNote`, `dataClass: 'consented-feedback-candidate'`, `retentionDays`, `deletionRequestedAt`.
- `redactFeedbackText()`: allowlist-shaped redaction removing emails, bearer/JWT-shaped strings, UUIDs, keys, URLs with credentials, and any free-form remainder beyond a bounded length; returns the redacted string plus the list of redaction reasons.
- Explicit contract: a candidate is never runtime input. Promotion to a lesson requires human review through section A.

### F. Approved-lesson retrieval

`src/supervisor/learning/lessonRetrieval.ts` (pure) and a mirrored read in `_shared`
- Only `status: 'active'` lessons may be selected; retrieval returns ids so they land in the provenance record.
- Injection point is the system-prompt preamble only, and always after the deterministic truth envelope, so the truth path keeps precedence.

### G. Promotion and rollout contract

`src/supervisor/learning/promotionContract.ts`
- `PromotionCandidate`: baseline ref, candidate ref, prompt/policy/lesson deltas.
- Mandatory gates: truth suite, authorization/tenant isolation, provenance suite, typecheck, lint, architecture governance, schema truth, build.
- Regression thresholds: zero truth-case regressions, zero authorization regressions, no drop in grounded-citation rate.
- `evaluatePromotion()` returns `blocked` with reasons unless every gate passes; result object is immutable evidence (frozen, hashable).
- Rollout metadata: stage, percentage, rollback target, approver — recorded, not executed.

## Non-goals for Phase 1

Persisted feedback, lesson-authoring UI, embeddings/vector retrieval, automated model switching, any navigation or route change, any deployment.

## Affected surfaces

- Personas: platform admin / engineering reviewer (lesson + promotion authorship). No tenant-persona-visible change.
- Routes/navigation: none.
- Components: none required; `src/lib/copilot/streaming.ts` may ignore the new SSE event without change.
- Edge Functions: `copilot-stream` only (additive provenance event), plus three new `_shared` modules.
- Tables/policies: none in Phase 1.
- Secrets: none.

## Rollback

Everything is additive and code-only. Rollback is reverting the branch; the sole runtime-visible element is one extra SSE event, and `copilot-stream` is not redeployed in Phase 1, so production behavior is unchanged until a separately authorized deploy.

## Qualification commands

```
bun run typecheck
bun run lint
bun run verify:architecture-governance
bun run verify:schema-truth
bun run test:unit
bun run build
bun run verify:fast
```
Plus the truth lane when the branch is qualified for release: `bun run test:truth`.

## Phase 2 preview (not authorized here)

Additive migrations for `assistant_response_provenance`, `assistant_feedback_candidates`, `assistant_lessons` with per-tenant RLS scoped to authoritative organization membership, explicit GRANTs, retention and deletion jobs, and an admin-only review surface reached through permission-aware account/admin access, not a new global nav entry.

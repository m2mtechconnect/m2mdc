# AURA DC Phase Delivery Ledger

Status: controlled remediation plan; no production, merge or publish action
Inventory date: 2026-09-04
Reviewed branch: `fix/auth-email-hook-perimeter`
Reviewed base commit: `7441ac3a03da926383830afad428a868d9d8bd30`
The implementation checkpoint is the current commit on this feature branch;
resolve it with `git rev-parse HEAD` when producing release evidence.

## Product north star

AURA DC is the trusted decision and control plane around a data-centre digital
twin. Its product spine is:

`inspect -> configure -> simulate -> decide -> verify`

Every result must be tenant-scoped, persisted, provenance-labelled,
explainable and auditable. A 3D preview, a mock, a public repository, a model
configuration or a planned provider is not evidence of a connected or measured
production capability.

## Operating contract for the AURA supervisor

The supervisor participates in every phase using the same sequence:

1. **Audit** the exact branch: personas, routes, state, API/Edge Functions,
   database/RLS, external boundaries, fixtures, evidence and release state.
2. **Implement** one atomic, reversible change that preserves security,
   provenance and stable navigation.
3. **Qualify** the affected unit, integration, browser and exact-head gates.
   Missing, blocked, skipped, stale or unavailable evidence remains unverified.
4. **Learn** only from reviewed outcomes by adding a mechanism-level lesson and
   a synthetic regression case. Learning never changes model weights or grants
   autonomous authority.
5. **Report** observed, inferred, changed, tested, deployed and production-
   verified states separately.

## Phase gates

| Phase | Outcome | Current state | Exit criteria |
| --- | --- | --- | --- |
| 0. Containment and truth | Remove fabricated claims and encode defect-family learning | **Complete for this branch**: 12 active lessons, 21 synthetic cases, focused suite 105/105 | No known truth-control regression; registry integrity, lint, typecheck and build green |
| 1. Trusted vertical slice | Engineer/operator completes inspect -> simulate -> decide -> verify | **Repository contract complete; live QA blocked**: focused vertical-slice, persistence and authenticated-QA-harness contracts 16/16, including unavailable-tenant fail-closed handling | Authenticated UI-to-API-to-Supabase persistence, reload/resume, denial, failure, tenant/RLS and append-only decision evidence all pass in disposable QA |
| 2. Persona journeys | Owner/admin, engineer/operator, executive, compliance and viewer complete role-appropriate jobs through one shell | **Planned** | Each family has a golden journey with context, primary task, durable result, reload, handoff where applicable, and a negative case; narrow/keyboard/accessibility states pass |
| 3. Provider and AI qualification | Add external runtimes only where evidence supports them | **Planned** | Provider boundary is isolated; model card, dataset lineage/license, held-out metrics, calibration, fallback and reproducible artifacts exist; unavailable claims remain unavailable |
| 4. Release and operations | Promote one exact SHA with complete evidence | **Blocked until phases 1-3 qualify** | All required CI, visual, security, tenant, artifact/SHA, production fingerprint, rollback and human approval gates are green on the same SHA |

## Phase 1 acceptance matrix

The first vertical slice is not complete until each row has fresh evidence in a
disposable authenticated environment:

| Boundary | Required proof |
| --- | --- |
| Context | Active organization, facility, persona, mode and run are server-resolved and consistent across routes |
| Create | UI action calls the canonical API/Edge boundary with a validated response contract |
| Persist | The authoritative run and decision survive reload and are visible only to authorized tenant members |
| Deny | Null, mismatched or cross-tenant context fails closed; UI role labels do not grant authority |
| Truth | Simulated, unverified, stale and measured states remain distinct in labels, KPIs, exports and copilot answers |
| Evidence | Artifact, candidate SHA, approval and production fingerprint form one exact-head chain |
| Recovery | Timeout, cancellation, backend failure and retry have explicit user-visible states |

## Current blockers and non-goals

- The standard unit and coverage commands now disable file parallelism and cap
  workers at one. This closes the known builder-store, builder-URL and legacy
  simulation runner-contention failure mode; a complete serial run passed
  2,881/2,881 tests. Ad-hoc parallel runs remain unqualified and are not
  release evidence.
- The DSX broker lane is unavailable without a local broker; no data was
  simulated to manufacture evidence.
- Repository-only schema truth does not qualify a deployed database.
- No destructive table/code cleanup is authorized from static reachability
  alone. Applied migrations remain immutable.
- No NVIDIA/PhysicsNeMo model is imported or presented as active until Phase 3
  evidence exists.
- Lovable may be used for reversible visual proposals; Codex remains the source
  of truth for backend wiring, security, tests and exact-head qualification.

The authenticated-QA harness contract is now regression-tested in
`tests/unit/phase1-authenticated-qa-harness-contract.test.ts`. It verifies the
explicit disposable-QA switch, runtime identity requirements, normal UI login,
loopback-only Supabase target and the fact that the current live suite is not
yet evidence for persisted simulation decisions. It does not create a QA
tenant, contact a cloud project or turn skipped live acceptance into a pass.

The guarded persisted simulation journey is registered as a blocking lifecycle
spec in `config/aura-release-contract.json` and is therefore included by the
canonical release E2E runner once disposable QA is available.

## Definition of complete

“End-to-end working” means a named persona can complete a real job through the
canonical shell, the backend persists the result under the correct tenant and
authorization boundary, a second persona can safely consume the result, the
system survives reload and failure, evidence binds to one exact SHA, and the
same state is honestly represented in the UI, APIs, datasets, exports and AI
responses. A green build alone is not completion.

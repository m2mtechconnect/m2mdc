# AURA DC — Implementation Plan

AURA DC is the enterprise application and operational control plane surrounding
NVIDIA DSX. NVIDIA DSX provides the digital-twin, OpenUSD, simulation and
visualization foundation. AURA DC provides identity, tenancy, asset management,
telemetry, workflows, grounded AI, approvals, auditability and observability.

## 1. Environment constraint (must be read first)

The AURA DC repository as it exists today is a **React + Vite + TypeScript
frontend with a Supabase (PostgreSQL + Deno Edge Functions) backend**. The build
environment that executes this work runs only that stack.

The target architecture requires runtimes that **cannot be executed or verified
here**: FastAPI (Python), Temporal, NATS JetStream, TimescaleDB, Redis, Kubernetes,
Helm, Terraform, Argo CD, NVIDIA NIM, NeMo Retriever, Omniverse Kit, DDN Infinia.

Therefore this plan is executed as follows:
- Work that is genuinely runnable here (containment, security, RLS, contracts,
  provider boundaries, typed clients, tests, CI, documentation, Compose/Helm/
  Terraform source) is **implemented and verified**.
- Work that requires an external runtime is delivered as a **documented provider
  interface plus a truthful local adapter**, and classified CONFIGURED, STUBBED or
  PLANNED. A local adapter is never presented as proof the production integration works.

## 2. Dependency-ordered phases

| Phase | Scope | Runnable here | Status |
|---|---|---|---|
| 0 | Baseline, containment, honest labelling, CI repair | Yes | IN PROGRESS |
| 1 | Canonical tenant/user/role/permission model, RLS repair, privileged writes behind server code, immutable audit | Yes (Postgres + Edge Functions) | PLANNED |
| 2 | Control-plane API, versioned contracts, typed frontend client, health/readiness | Partially (Edge Functions now, FastAPI source only) | PLANNED |
| 3 | S3-compatible storage abstraction, real document lifecycle | Interface + local adapter | PLANNED |
| 4 | DSX session service, WebRTC streaming | Interface + local adapter | PLANNED |
| 5 | Telemetry ingestor, NATS, TimescaleDB, DSX data delegate | Source + contracts only | PLANNED |
| 6 | Temporal simulation workflows, real solver | Source + contracts only | PLANNED |
| 7 | NIM + NeMo Retriever + pgvector grounded RAG | pgvector runnable; NIM/NeMo PLANNED | PLANNED |
| 8 | Governed actions, separation of duties, approvals | Yes | PLANNED |
| 9 | Kubernetes/Helm/Terraform, observability, soak testing | Source only | PLANNED |

## 3. Release-blocking defects register

| ID | Defect | Verified | Status |
|---|---|---|---|
| B-01 | Conflicting role systems (`RBACContext` app_role enum vs `useUserPermissions` admin/operator/viewer/owner) | Yes | OPEN |
| B-02 | `has_role(uuid, app_role)` compares `text` to `app_role`; 10 RLS policies never evaluate | Yes | OPEN |
| B-03 | Anonymous read of `sites` and `dc_blueprint_templates` via publishable key | Yes | OPEN |
| B-04 | Possible cross-tenant access (no `tenant_id` on most entities) | Yes | OPEN |
| B-05 | Self-approval of consequential actions | Yes | OPEN |
| B-06 | Browser-side privileged database writes | Yes | OPEN |
| B-07 | RAG uploads discard file bytes | Yes | CLOSED (Phase 0 — honest rejection) |
| B-08 | Fabricated RAG answers, citations and token counts | Yes | CLOSED (Phase 0 — grounded failure) |
| B-09 | Simulated telemetry presented as live | Partly | OPEN |
| B-10 | Connector catalogue labelled MCP | Yes | OPEN |
| B-11 | Omniverse transport disconnected | Yes | OPEN (DISCONNECTED) |
| B-12 | CI workflows invoking nonexistent scripts | Yes | CLOSED (Phase 0) |
| B-13 | Large numbers of failing tests | Yes | OPEN — corrected baseline 224 |
| B-14 | Missing structured observability | Yes | OPEN |
| B-15 | Documentation presenting planned capability as implemented | Yes | IN PROGRESS |

## 4. Retain / refactor / replace / retire

| Area | Decision |
|---|---|
| `src/components`, `src/pages`, design tokens, i18n, tours | RETAIN and improve |
| `src/dsx/*` evidence workspaces, provenance badges | RETAIN — already truth-labelled |
| `src/simulation/*` provider boundary | RETAIN — becomes the solver provider seam |
| `src/contexts/RBACContext.tsx` + `src/hooks/useUserPermissions.ts` | REPLACE with one permission-based authority (Phase 1) |
| Supabase Edge Functions (157, 45–51% orphaned) | AUDIT then RETIRE orphans; never delete without a call graph |
| `rag-*` functions | REPLACE with the agent service and document-ingestion worker |
| Legacy `RDC` / non-AURA-DC naming | RETIRE — AURA DC is the only product name |

## 5. Sequencing invariants
1. Break the identity type mismatch (B-02) before writing any new RLS.
2. Remove fabrication before building the real replacement.
3. No edge-function deletion without a verified call graph.
4. Keep functioning behaviour until its replacement passes its acceptance gate.

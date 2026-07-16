# AURA Capability Traceability Matrix — Phase 0

Status legend:

- **IV** — Implemented and runtime-verified (evidence of end-to-end execution against real dependencies)
- **INV** — Implemented but not runtime-verified in this baseline
- **PROTO** — Prototype / demonstration only
- **MOCK** — Mocked or synthetic data behind the surface
- **SCAF** — Scaffolded (types, files, or endpoints exist; behavior is stubbed)
- **NI** — Not implemented
- **UTV** — Unable to verify in Phase 0

---

## Platform foundations

| Capability | Status | Evidence (file : line / artifact) | Notes |
|---|---|---|---|
| React 18 + Vite app | IV | `package.json`; `vite build` PASS | Bundle 3.24 MB (gzip 840 KB) — code-splitting warning |
| TypeScript build | INV | `tsgo --noEmit` PASS; **`tsc` FAIL** in `src/twins/dataCenter/omniverseAdapter.ts` (23 errors) | Two typecheckers disagree — Phase 1 must reconcile |
| Supabase (Lovable Cloud) backend | IV | 17 migrations in `supabase/migrations/`; RLS + policies present per tables list | |
| Auth + RBAC | IV | `user_roles` table, `has_role()` SECURITY DEFINER function, `RBACContext.tsx` | Matches audit "REAL" list |
| Row-Level Security | IV | Policies enumerated in `<supabase-tables>` context | 100+ tables, policies present |
| Admin approval workflow | INV | `AdminUserApproval.tsx`, `PendingApproval.tsx`, `onboarding_submissions` table | Not exercised in Phase 0 |
| i18n (en / fr-CA) | IV | `src/i18n/config.ts`; localStorage persistence memory | English default confirmed |
| CI workflows | INV | `.github/workflows/{qa-suite,seo-validation,test,visual-regression,yvr-regression}.yml` | Not executed locally in Phase 0 |
| SEO build gate | IV | `scripts/seoBuildGate.ts` executed in `vite build`; PASS 0/0 | |

## Agents, workflows, RAG

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Agent CRUD | INV | `agents` table + `agents-*` edge functions | |
| Agent chat / streaming | INV | `agent-stream`, `agent-execute`, `copilot-*` edge fns | Uses Lovable AI Gateway |
| Workflow editor (Fabric.js) | INV | `src/components/workflow/`, `workflow-*` edge fns | Client-side simulation only |
| RAG document retrieval | INV | `rag_documents`, `match_documents()` pgvector fn, `rag-*` edge fns | |
| URL scanning | INV | `dc-scan-url`, `url-*` edge fns, `Firecrawl` secret present | |
| Page-aware CoPilot | INV | `CoPilotCommandContext.tsx`, `copilot-*` edge fns | Presented in UI as ops intelligence — see risk in "Compliance" |

## Data-centre digital twin

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Twin CRUD (DB) | INV | `data_centre_twins`, `digital_twins`, `sovereign_dc_facilities` tables | |
| Twin builder wizard | INV | `src/components/builder/steps/Step{1..6}*.tsx` | |
| 3D visualization | PROTO | `src/components/twin-visualization/**` (Three.js) | **Procedural — labelled "Omniverse RTX Viewport" in UI, must be relabelled** (`OmniverseStreamViewer.tsx:112`) |
| Facility topology / equipment registry | NI | No `facilities`, `racks`, `pdus`, `crahs`, `sensors` tables in schema | Phase 2 P0 |
| BMS / DCIM / EPMS ingest | NI | No edge function, no gateway, no schema | Requires facility + credentials |
| GPU telemetry (DCGM) | NI | No integration | |
| KPI values (PUE, sovereignty, audit-readiness, carbon intensity) | MOCK | 222 `Math.random()` lines across `src/simulation/`, `src/twins/*`, `src/engines/*`, `src/sovereignty/` | Presented as live in dashboard |
| Simulation engines | PROTO (×4 duplicated) | `src/simulation/SimulationEngine.ts`, `src/simulation/generateSimulationResult.ts`, `src/twins/dataCenter/simulationEngine.ts`, `src/twins/sovereignDataCenter/{simulationEngine,enhancedSimulationEngine}.ts` | Rules/formula-based, not physics |
| Mock data trees | MOCK (×3 duplicated) | `src/twins/dataCenter/mockData.ts`, `src/twins/sovereignDataCenter/mockData.ts`, `src/sovereignty/mockData.ts` | Consolidation is Phase 1 P0 |
| Predicted vs observed validation | NI | No table, no telemetry to compare against | |

## NVIDIA Omniverse / DSX

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Omniverse Kit REST client | SCAF | `src/integrations/omniverseKit/client.ts` | Hard-coded IPv4 fallback (redacted), unreachable |
| WebRTC AppStreamer viewer | SCAF | `src/components/twin-visualization/OmniverseStreamViewer.tsx` | Depends on `window.OVWebStreamingLibrary` global; no library loaded in `index.html` verified in Phase 0 |
| M2M-controlled Kit deployment | NI | No infrastructure-as-code, no GPU host | |
| OpenUSD asset registry | NI | No storage bucket, no schema, no versioning | |
| NVIDIA DSX Sim | NI | Not present | |
| DSX Exchange / NATS event bus | NI | Not present | |
| Fleet Intelligence / Run:ai / NVSentinel | NI | Not present | |
| Modulus / calibrated physics | NI | Not present | |

## Compliance and security

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| "SOC 2 / ISO 27001 / Law 25" marketing claims | PROTO | Strings across 20+ files (`src/pages/`, `src/components/`, `src/data/`) | **Legal review required — see blockers** |
| Compliance evidence store | NI | No `controls`, `control_evidence` tables | |
| Signed evidence chain | NI | No Ed25519 keys, no signing service | |
| Audit logs | INV | `audit_logs`, `agent_action_logs`, `policy_audit` tables | Coverage across write paths not verified in Phase 0 |
| Agent write-action approvals | NI | No approval queue table, no dual sign-off | Blocks operational-agent enablement |
| Read-only vs write agent tools | NI | No `tool_mode: read \| write` split in agent tools schema | |
| Secrets management (backend) | INV | 20 secrets listed in project (values not read) | 3 connector-managed |
| Hard-coded infrastructure endpoints | (finding) | `vite.config.ts:14`, `OmniverseStreamViewer.tsx:41`, `omniverseKit/client.ts:10` | Redacted; fallback must be removed |

## Test and quality baseline

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Unit + integration test infra | INV | Vitest configured; 858 tests collected | |
| Test **pass rate** | (finding) | 557 pass / 198 fail / 103 skip; 145 failing files | **Pre-existing red baseline** |
| Playwright specs | UTV | `tests/e2e/**` (100+ specs) | Not executed in Phase 0 |
| ESLint | (finding) | 1471 problems (1335 err / 136 warn) | Pre-existing |
| Dependency vulnerability audit | UTV | Not executed per Phase 0 clarification #5 | |

---

## Summary counts

| Status | Count of rows above |
|---|---|
| IV — Implemented & verified | 8 |
| INV — Implemented, not runtime-verified | 15 |
| PROTO — Prototype / demo | 4 |
| MOCK — Synthetic data | 2 |
| SCAF — Scaffolding | 2 |
| NI — Not implemented | 12 |
| UTV — Unable to verify | 2 |

Runtime-verified capabilities are foundational plumbing (auth, RBAC, RLS, SEO gate, i18n, build). Every capability needed to call AURA an *operational* digital twin is currently PROTO, MOCK, SCAF, or NI.
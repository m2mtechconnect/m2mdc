# AURA DC — Architecture

## Target architecture

```mermaid
flowchart TB
    USER["AURA DC users"] --> EDGE["CDN, WAF and OIDC"]
    EDGE --> WEB["AURA DC React portal"]
    WEB <-->|"REST and WebSocket"| API["AURA DC FastAPI control plane"]
    WEB <-->|"WebRTC"| DSX["NVIDIA DSX / Omniverse Kit runtime"]
    API --> AUTH["Identity and policy layer"]
    API --> PG["PostgreSQL"]
    API --> SESSION["DSX session service"]
    API --> WORKFLOW["Temporal workflows"]
    API --> AGENT["NVIDIA NIM agent service"]
    OT["DCIM, BMS, DCGM, Redfish, SNMP and OT systems"] --> INGEST["Telemetry ingestor"]
    INGEST --> EVENT["NATS JetStream"]
    EVENT --> TS["TimescaleDB"]
    EVENT --> DELEGATE["DSX data delegate"]
    DELEGATE --> DSX
    WORKFLOW --> SOLVER["Simulation workers"]
    SOLVER --> STORAGE["DDN Infinia object storage"]
    STORAGE --> DSX
    AGENT --> RETRIEVAL["NeMo Retriever and pgvector"]
    RETRIEVAL --> STORAGE
```

## Current architecture (verified 2026-08-07)

```mermaid
flowchart TB
    USER["Users"] --> WEB["React + Vite portal (IMPLEMENTED)"]
    WEB --> SB["Supabase JS client (browser, privileged writes) [BROKEN]"]
    SB --> PG["PostgreSQL - fragmented roles, partial RLS [BROKEN]"]
    SB --> EF["157 Deno Edge Functions, 45-51% orphaned [DISCONNECTED]"]
    WEB --> SIM["In-browser deterministic simulation engine [MOCKED]"]
    WEB --> KIT["Omniverse Kit client [DISCONNECTED]"]
    EF --> RAG["rag-* functions [STUBBED - Phase 0 contained]"]
    WEB --> TELEM["Seeded synthetic telemetry generators [MOCKED]"]
```

## Component status

| Component | Target | Today | Status |
|---|---|---|---|
| Web portal | React/TS strict/Vite | React/TS/Vite, strict partial | IMPLEMENTED |
| Control plane | FastAPI modular monolith | Supabase Edge Functions | PLANNED |
| Identity | OIDC + central RBAC/ABAC | Supabase Auth + two conflicting role systems | BROKEN |
| Operational data | PostgreSQL + RLS + tenant_id | PostgreSQL, no tenant model, partial RLS | BROKEN |
| Time-series | TimescaleDB | none | PLANNED |
| Events | NATS JetStream | none | PLANNED |
| Workflows | Temporal | none | PLANNED |
| Object storage | DDN Infinia (S3 API) | none | PLANNED |
| Digital twin | DSX + Omniverse Kit + OpenUSD | Kit client present, transport disabled | DISCONNECTED |
| Twin delivery | NVIDIA WebRTC streaming | none | PLANNED |
| AI inference | NVIDIA NIM | browser LLM client disabled | STUBBED |
| Retrieval | NeMo Retriever + pgvector | none | STUBBED |
| Observability | OpenTelemetry stack | console logging | PLANNED |
| Deployment | K8s + Helm + Terraform + Argo CD | static hosting | PLANNED |

## Target repository organization

`apps/{web,api,dsx-session-service,telemetry-ingestor,agent-service}`,
`workers/{simulation-worker,document-ingestion-worker}`,
`packages/{ui,contracts,auth,observability,dsx-client,telemetry-client}`,
`infrastructure/{docker,kubernetes,helm,terraform,argocd}`,
`database/{migrations,seeds,policies}`, `docs/`, `tests/`.

Migration is incremental. `src/` remains the live web application until
`apps/web` passes its acceptance gate.

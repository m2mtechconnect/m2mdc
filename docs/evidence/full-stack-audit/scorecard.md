# Production Readiness Scorecard

Scoring: 0 = absent, 50 = partially implemented, 75 = implemented but unverified at runtime,
100 = implemented and evidenced.

| Domain | Score | Basis |
|---|---|---|
| Anonymous access closure | 100 | Runtime-proven 401 on every probed table and the OpenAPI root |
| Authentication and route guards | 80 | Anonymous redirect proven at runtime; guards are client-side by design and RLS-backed |
| Role model and privilege escalation | 75 | Separate `user_roles`, direct writes revoked, audited RPCs - static evidence only |
| Tenant isolation | 40 | Org scoping exists on a minority of tables; no second identity available to verify |
| Database security (RLS coverage) | 75 | 114/120 tables with RLS, 333 policies, `search_path` pinned; no migration replay |
| Edge function security | 45 | 12 unauthenticated service-role functions, SSRF surface, 98 orphans |
| Secrets handling | 90 | No service key in bundle, browser LLM disabled, vault migration path exists |
| Data provenance and truthfulness | 35 | Exemplary in DSX/workspace; absent on the legacy operational pages |
| Capability truthfulness (self-reporting) | 85 | Registry openly reports 0 live sources and NO-GO |
| NVIDIA / Omniverse / DSX integration | 20 | Adapters present, all disabled and fail-closed; nothing proven live |
| AI / RAG | 30 | Retrieval stubbed with honest 501s; no embedding pipeline |
| Test coverage and quality gates | 25 | 229 failing tests, no CI gate on tests/lint/typecheck |
| Build and delivery | 70 | Build passes; 42 MB dist dominated by a 35 MB video |
| **Overall** | **52** | **NO-GO (provisional)** |

## Path to GO

1. Close P0-1 (provenance on legacy pages) - this is the single largest credibility risk in a
   customer-facing pilot.
2. Close P0-2 and P0-3 (green suite behind a CI gate) so every other fix becomes durable.
3. Close P1-1 and P1-2 (edge function auth and SSRF allowlists).
4. Provision a disposable Supabase environment so RLS, tenant isolation and role-mutation paths
   can be proven at runtime with at least two non-admin identities. Until then the database
   security score is capped at "unverified".
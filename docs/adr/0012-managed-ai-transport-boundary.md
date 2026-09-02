# ADR 0012 — Managed AI transport boundary

Status: Accepted in the review branch. Production rollout remains separately gated.

## Decision

AURA keeps its current React/Vite and Supabase/Postgres/Deno architecture. AI-enabled
Edge Functions must reach model providers through the shared server-owned transport
in `supabase/functions/_shared/ai-client.ts`.

Runtime callers may select only a named server-owned profile. They may not supply a
provider endpoint, credential or arbitrary model identifier. The deterministic truth
path remains ahead of every model invocation, and model output remains subordinate to
tenant-scoped evidence, RLS, capability gates and response provenance.

OpenRouter is not introduced now. It may be evaluated later as an additional adapter
only when there is a measured need for multi-provider routing or failover, together
with privacy, residency, cost, observability, evaluation, canary and rollback evidence.

FastAPI is not introduced now. A separate Python service is justified only when AURA
has a measured Python-native workload that cannot be operated safely and simply in the
existing Edge Function control plane. It must not become a second authorization or
tenant-policy authority.

## Consequences

- The already-qualified release candidate is unchanged; this work is reviewed and
  qualified separately.
- Provider changes are isolated behind one server boundary without changing browser
  contracts or exposing secrets.
- All AI completion callers use the shared transport. A repository contract test fails
  if the managed completion endpoint appears outside that boundary.
- Provider failure bodies are sanitized at the boundary. Request correlation,
  operation, profile, status and latency evidence are recorded without prompts,
  credentials or provider response bodies.
- Adding a new AI gateway or Python service requires a new decision record and exact-SHA
  qualification rather than dependency installation alone.

## Rollout gate

This decision is implemented and locally qualified, but not deployed by this ADR.
Production promotion requires the normal exact-SHA release checks, a canary, rollback
readiness and a 30-day observation window for reliability, latency, cost and model
quality. The observation window cannot be inferred from local tests.

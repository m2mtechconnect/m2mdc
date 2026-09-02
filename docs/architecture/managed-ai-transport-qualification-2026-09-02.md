# Managed AI transport qualification — 2026-09-02

## Scope and observed baseline

- Review branch: `review/ai-transport-consolidation-20260902`
- Starting commit: `9eebebb86f5c862c04dff6b2bce9710c2f624c9d`
- Runtime architecture remains React/Vite plus Supabase/Postgres/Deno Edge Functions.
- No database schema, RLS, route, navigation, persona, browser contract or production
  configuration change is part of this work.
- Before remediation, 29 feature modules owned direct managed-gateway requests in
  addition to the existing shared-adapter callers.

## Implemented remediation

- Consolidated every AI completion endpoint request behind
  `supabase/functions/_shared/ai-client.ts`.
- Added server-owned `reasoning`, `balanced`, `fast` and `fallback` profiles while
  retaining compatibility aliases for already-qualified shared callers.
- Prevented feature handlers from providing an endpoint, credential or arbitrary
  provider model.
- Added operation/request correlation plus status and latency evidence. Prompts,
  credentials and provider response bodies are not included in telemetry.
- Sanitized non-success provider responses at the shared boundary.
- Corrected agent and copilot execution metadata to report evidence from the request
  that actually ran rather than a model identifier stored in a draft.
- Added a repository contract test that permits the completion endpoint only in the
  shared adapter and guards the limited, separate managed-connector credential
  boundary.

## Architecture decision

OpenRouter and FastAPI remain deferred. This change creates the provider-neutral
adapter seam required to add an OpenRouter adapter later without changing feature
handlers. A second Python control plane is not justified by a measured Python-native
workload and would duplicate authorization, tenant and operational boundaries.

Reconsider OpenRouter only with measured multi-provider failover/routing need and a
privacy, residency, cost, evaluation, canary and rollback package. Reconsider FastAPI
only for a measured workload that cannot be operated safely in the current Edge
Function boundary.

## Qualification and release truth

Local qualification results:

- focused AI runtime/transport contracts: 13 passed;
- application TypeScript check: passed;
- repository lint: passed with 0 errors (1,015 non-blocking repository warnings remain);
- architecture governance: passed with no governance errors;
- schema truth: `PASS_REPOSITORY_ONLY`;
- unit suite: 2,847 passed and one unrelated builder test timed out under the full
  parallel run; that file passed 2/2 immediately when retried alone;
- integration suite: 38 passed and 66 environment-gated tests skipped;
- production build and SEO validation: passed.

The release-mode schema check correctly returned `FAIL` because no read-only deployed
metadata snapshot was supplied. Repository-only success must not be presented as
deployed schema parity. Passing local tests does not prove production health. This
work is not merged, deployed or production-verified by this document.

Production promotion must include:

1. exact-SHA checks and release approval;
2. canary execution for representative reasoning/fast and streaming paths;
3. rollback readiness to the previous Edge Function bundle;
4. 30 days of observed reliability, latency, cost, fallback and quality evidence;
5. a review checkpoint before any new gateway or Python runtime is proposed.

## Rollback

Revert the transport-consolidation commit and redeploy the previous qualified Edge
Function bundle. No database rollback is required because this change adds no
migration or persistent schema dependency.

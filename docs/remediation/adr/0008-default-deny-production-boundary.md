# ADR 0008 — Default-Deny Production Boundary (PR-0.1)

**Status:** Accepted (Checkpoint B, 2026-07-24)
**Supersedes:** none

## Context

Gate 0 identified three converging P0s: (a) any authenticated user could
self-elevate to `admin` via a `user_roles_insert_own` policy;
(b) `VITE_LOVABLE_API_KEY` shipped in every browser bundle; (c) 155 edge
functions were deployed with no explicit production disposition, including
one (`green-dc-recommend`) that opted out of gateway JWT verification and
performed URL-driven outbound HTTP.

## Decision

PR-0.1 adopts a **default-deny production boundary**:

1. `public.user_roles` accepts no direct writes from `anon` or
   `authenticated`. Role changes occur exclusively through
   `public.admin_assign_role` / `public.admin_revoke_role`, which verify
   the caller is approved and holds `admin`, and which append to
   `public.role_change_audit`.
2. The client bundle contains no provider credential. Browser-side LLM
   access is stubbed to `LlmUnavailableError` until a server-mediated
   proxy is authorised in a later checkpoint.
3. `docs/remediation/evidence/pr-0.1/route-allowlist.json` is the single
   source of truth for the production surface. It is intentionally empty
   for functions. Adding a function requires: `_shared/authz.ts` import,
   explicit `is_approved` + role check, explicit CORS origin, request
   schema validation, and sanitized error envelopes.
4. `green-dc-recommend` is disabled at the runtime, gateway, and
   deployment layers. Restoration requires SSRF hardening in a future PR.
5. Omniverse endpoints are unavailable-by-default. `readKitConfig()`
   fails closed and any deployment must inject a validated, TLS,
   server-mediated endpoint.

## Consequences

- The pilot surface is minimal: `/`, `/login`, `/onboarding`,
  `/reset-password` on the client; zero functions on the server.
- Existing dashboards that expected LLM completions or live Omniverse
  telemetry now display typed "unavailable" states — this is intended.
- Any future function addition is gated by
  `scripts/verify-production-perimeter.mjs`, which CI runs on every push.

## Non-goals

- SSRF-hardening `green-dc-recommend`.
- Building a replacement LLM edge-function proxy.
- Migrating simulation consumers (deferred to Phase 1B.2b).
- Live Omniverse/BMS/DCIM integrations.
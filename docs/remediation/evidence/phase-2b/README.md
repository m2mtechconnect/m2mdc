# Phase 2.b — DSX Ingestion Boundary Evidence

## Scope
Deploy a hardened `dsx-ingest` Edge Function that authenticates the DSX
gateway with an RS256-pinned JWT (verified against a locally
configured JWKS), resolves the connection server-side, and calls the
`public.dsx_ingest_event` RPC. Every failure path returns a sanitized
`{ ok:false, error, request_id }` envelope; keys, kids, tenants,
claims, and Zod issues never appear in responses.

## Authentication sequence (in order, non-reorderable)
1. Method + `Authorization: Bearer <jwt>` shape (bounded to 8 KiB).
2. `decodeProtectedHeader` only — pin `typ=JWT`, `alg=RS256`, non-empty
   `kid`.
3. Select exactly one JWK by `kid` from `DSX_GATEWAY_JWKS_JSON`.
   JWKS loader rejects private material (`d/p/q/dp/dq/qi`), non-RSA
   `kty`, `use != sig`, `alg != RS256`, duplicate `kid`, missing
   `dsx_key_ref`, and modulus < 2048 bits.
4. `jose.jwtVerify` — enforce `iss`, `aud`, `typ=JWT`, 30 s clock
   tolerance, 5 min `maxTokenAge`, and reject `exp - iat > 5 min`.
5. Resolve `public.dsx_connections` via service role by the verified
   `sub` (matched against `allowed_source_subjects`). Reject if not
   found, ambiguous, `status != active`, or if
   `dsx_connections.gateway_jwt_key_ref` does not equal the JWK's
   `dsx_key_ref`.
6. Only now read the request body (bounded to 64 KiB via
   `Content-Length` + streaming guard).
7. Parse through `parseDsxEvent` (strict, single source of truth).
8. Reject if `envelope.connection_id` does not match the resolved
   connection ID.
9. Call `public.dsx_ingest_event` (SECURITY DEFINER) with the
   server-resolved `p_connection_id`. Never trust envelope tenancy.

## Required environment
| Variable                     | Purpose                                             |
|------------------------------|-----------------------------------------------------|
| `DSX_GATEWAY_JWKS_JSON`      | Public RSA JWKS (RS256, `dsx_key_ref` per entry).   |
| `DSX_GATEWAY_JWT_ISSUER`     | Expected `iss` claim.                               |
| `DSX_GATEWAY_JWT_AUDIENCE`   | Expected `aud` claim.                               |
| `SUPABASE_URL`               | Managed automatically.                              |
| `SUPABASE_SERVICE_ROLE_KEY`  | Managed automatically. Only used inside handler.    |

`config.toml` sets `verify_jwt = false` for `dsx-ingest`. Rationale is
documented at `supabase/config.toml`: the gateway signs with its own
key that Supabase's platform verifier cannot recognize, so the handler
performs the full in-code verification described above.

## Test evidence
`supabase/functions/dsx-ingest/index_test.ts` — 17 Deno tests, all
passing. Adversarial coverage:
- Unknown `kid`.
- Header rewritten to `alg=none`.
- Expired token / lifetime > 5 min.
- Wrong `iss` / wrong `aud`.
- Missing header.
- Resolver: not_found, ambiguous, inactive, key-ref mismatch.
- Envelope: missing `schema_version`, `connection_id` mismatch.
- Payload > 64 KiB via `Content-Length` (413).
- JWKS containing private material rejected on load.
- Duplicate RPC decision surfaces as 200 `ok:true`.
- Non-POST → 405.

Run locally: `supabase functions test dsx-ingest`.

## Deployed-endpoint smoke
`POST /dsx-ingest` with empty `Authorization` header returned:
```
HTTP/1.1 401
{ "ok": false, "error": "unauthorized", "request_id": "…" }
```
No key, kid, alg, or claim information leaked. Body is never read on
auth failure (verified by ordering in `handleRequest`).

## Phase 2.c hooks
`tests/database/02_dsx_rls_suite.sh` — adversarial RLS proof suite for
the DSX tables (two orgs, two approved users, one unapproved user,
`anon`, `authenticated`, `service_role`). Requires a disposable
Postgres with the Phase 2.a migration applied. Not runnable against
production DB per Checkpoint B protocol.

## Non-goals for this slice
- No JWKS rotation scheduler (out of scope; keys are hot-reloaded per
  request via env value equality check).
- No `jti` replay cache (structural gap: requires a dedicated table;
  documented for Phase 2.d).
- Live DSX gateway keypair provisioning is a deployment concern; the
  handler consumes any RS256 JWKS that satisfies the loader.
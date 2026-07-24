# PR-0.1 Checkpoint B — Completion Summary

**Applied:** 2026-07-24 (forward-only, single coordinated batch)

## What landed

| Gate | Result | Evidence |
| --- | --- | --- |
| B0 Denominator resolved | 155 deployable / 1 helper / 156 total | `anchor.json` |
| B1 `user_roles` lockdown migration applied | Only `user_roles_read_own` remains; DML revoked from `anon`/`authenticated`; audited assign/revoke functions added | `pg_policies` verified via `read_query`; report in `pr-0.1-auth-rls-report.md` |
| B2 Browser secrets removed | `VITE_LOVABLE_API_KEY` removed from `src/lib/llm/client.ts`; Omniverse plaintext endpoint removed from `.env` | `verify-production-perimeter.mjs` passes |
| B3 Production allowlist established | `route-allowlist.json` with 0 functions, 2 explicitly disabled, 153 default-deny | `route-allowlist.json`, `edge-function-inventory.json` |
| B4 `green-dc-recommend` disabled | `verify_jwt = true`, runtime returns 503, no outbound HTTP | `supabase/config.toml`, `supabase/functions/green-dc-recommend/index.ts` |
| B5 CI enforcement live | `scripts/verify-production-perimeter.mjs` + `.github/workflows/production-perimeter.yml` | Local run: PASSED (155 inventoried, 0 allowlisted) |

## What is intentionally NOT in scope for PR-0.1

- SSRF-hardening `green-dc-recommend` (disposition: `disabled`).
- Building the server-mediated LLM proxy edge function.
- Migrating simulation consumers off the compat layer (Phase 1B.2b).
- Live Omniverse / BMS / DCIM integrations.

## What remains UNVERIFIED

- Runtime end-to-end proof of the `user_roles` lockdown against an authenticated PostgREST client (self-insert rejected, `admin_assign_role` success, cross-tenant deny, audit row present). Schema and grants are proven; the runtime path is not.
- Remote credential rotation (`LOVABLE_API_KEY`) and remote undeployment of non-allowlisted functions — external to this repo. Checklist: `pr-0.1-external-deployment-checklist.md`.

## Effective production perimeter (as of this checkpoint)

- Client routes: `/`, `/login`, `/onboarding`, `/reset-password`.
- Edge functions: **none**.
- Provider credentials in the browser bundle: **none**.
- Omniverse endpoints in tracked config: **none**.
- Role escalation surface: **admin-only, audited, no direct DML**.

See ADR 0008 for the governing decision record.
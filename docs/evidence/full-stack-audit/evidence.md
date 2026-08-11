# Raw Evidence

## Environment guard

`node scripts/aura-test-env-guard.mjs` -> **DENIED** for project ref `psfvrskpnwcshvajzeix`
(production denylist hit). No migration replay, no seeding, no mutating test executed.

## Quality gates (local)

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS |
| `eslint` | 1322 errors (dominated by `@typescript-eslint/no-explicit-any`) |
| `vitest run` | 1158 passed / 229 failed / 109 pending (deterministic across two runs) |
| `vite build` | PASS, `dist` 42 MB (`dist/landing/hero-datacenter.mp4` = 35 MB) |
| Bundle secret scan | `anon` JWT present (expected); no `service_role` key |

Failure categorisation (229): ASSERTION_MISMATCH 176, BLOCKED_BY_GUARD 29, CODE_DEFECT 24.
Guard-blocked failures span 5 of 32 failing files.

## Anonymous Data API probe (read-only, publishable key)

```
GET /rest/v1/            -> 401
GET /rest/v1/profiles    -> 401 42501 permission denied for table profiles
GET /rest/v1/user_roles  -> 401 42501
GET /rest/v1/onboarding_submissions -> 401 42501
GET /rest/v1/digital_twins -> 401 42501
GET /rest/v1/agents      -> 401 42501
GET /rest/v1/audit_logs  -> 401 42501
GET /rest/v1/organizations -> 401 42501
GET /rest/v1/integrations  -> 401 42501
```

The OpenAPI root itself returns 401, i.e. `anon` lacks schema usage - the Data API is closed to
anonymous callers outright. Table enumeration via PostgREST was therefore impossible with the
anon key, which is itself the desired outcome.

## Authenticated probe (read-only, injected admin session)

Identity: `user_roles` returns exactly one row, role `admin`.

| Table | Rows visible (exact count) |
|---|---|
| profiles | 324 |
| audit_logs | 418 |
| agents | 108 |
| onboarding_submissions | 14 |
| digital_twins | 0 |
| organizations | 0 |
| integrations | 0 |

Broad visibility is consistent with the `admin` role. **Non-admin visibility was not testable**
- no second identity was available. Tenant isolation therefore remains UNVERIFIED at runtime.

## Runtime route probe - authenticated (Chromium, 1280x1800)

All 12 probed routes render, each with exactly one `<h1>`, zero HTTP >=400 responses, and zero
console errors except one DOM-nesting warning on `/manage/facilities`.
Redirects observed: `/` -> `/dashboard`, `/sign-in` -> `/dashboard`, `/admin` ->
`/admin/signups-dashboard`, `/dsx/evidence-beta` -> `?scenario=cooling_degradation&mode=SIMULATED`.

## Runtime route probe - anonymous

`/dashboard`, `/admin`, `/admin/signups-dashboard`, `/teams`, `/manage/facilities`,
`/dsx/evidence-beta`, `/compliance` all redirect to `/` (public landing). No protected content
rendered. Client guards are correct; they are UX controls only - the authoritative boundary is
the RLS/grant layer probed above.

## Inventory counts

- Public tables created: ~120. RLS enabled: 114. Policies: 333.
- `SECURITY DEFINER` functions: ~40-51 definitions; `search_path` pinned in all final-state
  definitions (62 `search_path` occurrences across migrations).
- Edge functions: 157 directories. `verify_jwt=false`: 1 (`dsx-ingest`, compensated by in-code
  JWKS/iss/aud/exp verification).
- Grants to `anon` in final state: `INSERT` on `onboarding_submissions` only, plus schema usage
  revoked at the table layer (runtime probe returns 401 for reads).
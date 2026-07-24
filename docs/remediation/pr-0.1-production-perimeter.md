# PR-0.1 - Production Perimeter and Identity Hardening

**Status:** Checkpoint A complete (anchor + evidence). Awaiting approval before
destructive migrations, allowlist enforcement, secret removal, and test wiring.

## Anchor

| Item | Value |
| --- | --- |
| Git HEAD | `f3511b30ccefab90bb74fbc4e9d780dd73b279e0` |
| Working tree | clean |
| Lockfiles present | `package-lock.json`, `bun.lock`, `bun.lockb` (three - deterministic-install risk carried from Gate 0) |
| Migrations on disk | 17 (see `evidence/pr-0.1/migrations.txt`) |
| Supabase function directories | 156 (155 with `index.ts`, 1 `_shared`) |
| `verify_jwt = false` overrides | 1 (`green-dc-recommend`) |
| Client-declared routes | 70+ (see `evidence/pr-0.1/route-allowlist.json` - to be produced in Checkpoint B) |

## Corrected Gate 0 findings (evidence-based)

### 1. Edge-function authentication (155 deployed functions)

Supabase's gateway default is `verify_jwt = true`. Only `green-dc-recommend`
opts out, so the Gate 0 claim that "120/156 functions lack visible JWT/auth
checks" conflates *no in-code getUser()* with *unauthenticated*. Corrected
counts from `evidence/pr-0.1/edge-function-inventory.json`:

| Signal | Count |
| --- | --- |
| Deployed functions | 155 |
| Gateway JWT verification disabled | **1** (`green-dc-recommend`) |
| Enforces `is_approved` | **0** |
| Enforces role / admin check | 7 |
| Uses shared auth helper (`_shared/auth`) | 1 |
| Uses `SUPABASE_SERVICE_ROLE_KEY` | 32 |
| Has an in-repo client caller | 52 |
| Orphan (no client caller found) | 103 |

**Real P0s (both confirmed):**

- **A1.** No function on the platform enforces `profiles.is_approved`. Every
  authenticated user - including unapproved signups - can call any JWT-gated
  function. The approval gate is client-only (`src/App.tsx:131-139`).
- **A2.** `green-dc-recommend` is publicly reachable with no JWT, no
  approval, no rate limit, and performs outbound HTTP based on user-supplied
  URLs (SSRF class). Must be classified in Checkpoint B as either
  `disabled/unavailable` or hardened `public` with strict URL/DNS controls.

**Not a P0 but must be addressed in Checkpoint B:**

- 32 functions use the service role key and bypass RLS by design. Each needs
  an explicit disposition (`administrator` or `service-only`) plus an in-code
  authorization check; none may remain classified `unknown-blocked`.
- 103 orphan functions have no client caller in the repo. Default disposition
  proposal: `disabled/unavailable` unless a webhook or external consumer is
  documented.

### 2. Final RLS state on `public.user_roles` - P0 CONFIRMED

Migration `20251211234933_b6d2e072-6b68-461f-b36d-dfed0429f21d.sql` is the
last migration touching `user_roles` (later `2026*` migrations do not
re-define its policies). The final effective policy set is:

```
user_roles_read_own    SELECT  USING (auth.uid() = user_id)
user_roles_insert_own  INSERT  WITH CHECK (auth.uid() = user_id)
user_roles_update_own  UPDATE  USING      (auth.uid() = user_id)
user_roles_delete_own  DELETE  USING      (auth.uid() = user_id)
```

Any authenticated user can `INSERT (user_id = auth.uid(), role = 'admin')`
directly against PostgREST and become an administrator. The migration
comment ("Users can insert their own role on signup") makes clear this is
the active production behaviour, not legacy dead policy text. This is a
live privilege-escalation vulnerability and blocks any pilot.

### 3. Client-side secret exposure - P0 CONFIRMED

- `src/lib/llm/client.ts:72` reads `import.meta.env.VITE_LOVABLE_API_KEY`
  and sends it as a bearer token from the browser. Vite inlines `VITE_*`
  values at build; any production build with the variable set ships the
  provider key in the JS bundle.
- Committed `.env` line 4 pins `VITE_OMNIVERSE_KIT_URL="http://54.70.43.198:8011"`
  - plaintext HTTP to a public IP. Runtime code
  (`src/integrations/omniverseKit/config.ts`) correctly fails closed when
  unset, but the committed value re-enables the unsafe endpoint on every
  developer machine and any build that inherits the file.

### 4. Approval enforcement - server-side surface is empty

`is_approved` appears in `src/App.tsx`, three admin pages, and `Teams.tsx`
only. Zero edge functions reference it. Removing the client redirect (or
bypassing the SPA by calling PostgREST/functions directly) grants full
access to every user with a valid JWT.

## Deliverables produced in Checkpoint A

| File | Purpose |
| --- | --- |
| `docs/remediation/pr-0.1-production-perimeter.md` | This report (anchor + corrected findings) |
| `docs/remediation/pr-0.1-auth-rls-report.md` | RLS + identity findings and planned forward-only fix |
| `docs/remediation/evidence/pr-0.1/edge-function-inventory.json` | Per-function signals; all rows currently `unknown-blocked` (classification is Checkpoint B) |
| `docs/remediation/evidence/pr-0.1/anchor.json` | Machine-readable anchor |

## Deliverables intentionally deferred (pending approval)

**Checkpoint B (perimeter + identity fixes):**
- `route-allowlist.json` and CI enforcer that fails on unclassified routes/functions
- Forward-only migration removing `user_roles_insert_own` / `_update_own` / `_delete_own`
- `_shared/authz.ts` guards (`requireApprovedUser`, `requireAdmin`, `requireWebhook`)
- Client removal of `VITE_LOVABLE_API_KEY`; server-side edge-function proxy
- Removal of committed Omniverse endpoint; UI "integration unavailable" state
- SSRF hardening or disablement of `green-dc-recommend`
- Explicit production CORS allowlist

**Checkpoint C (proofs and gates):**
- `permission-matrix.tsv`, `gate-results.json`
- RLS Vitest suite exercising the database, not React
- Playwright permission-matrix, secret-scan, debug-route-exclusion tests
- ADR: default-deny production boundary

These items are destructive (irreversible for downstream consumers) or
require test infrastructure changes; both need explicit go-ahead per the
PR-0.1 brief.

## Verification not yet performed

- Disposable local Supabase database - required by Section 8 to prove RLS.
  Will be attempted in Checkpoint C via `supabase start` or documented as
  an external blocker per `docs/remediation/external-blockers.md`.
- Production bundle secret scan and debug-route inspection - pending
  Checkpoint B route allowlist implementation.

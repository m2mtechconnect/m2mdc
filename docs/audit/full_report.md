# AURA DC — Full Technical Architecture Audit

Evidence-based audit of the platform as it exists in this repository and its live Supabase project.
Method: static inspection of `src/`, `supabase/functions/`, `supabase/migrations/`, `.github/workflows/`;
read-only SQL against the live database; actual execution of the test, typecheck and lint toolchain;
Playwright runtime probes of route gating.

---

## 1. Executive verdict

AURA DC is a **large, well-structured demonstration platform with a genuine backend spine and a thin
layer of production discipline**. The React/Vite/Supabase core is real and works. What is *not* real:
the MCP layer, the RAG pipeline, Omniverse/DSX live transports, SSO/MFA, observability, and the CI
quality gates. Roughly 90% of the 157 edge functions are unreachable from the current frontend.

| Domain | Verdict |
|---|---|
| Frontend architecture | Solid, but TypeScript strict mode off, duplicate dirs/stores, no server-state caching in places |
| Routing / auth gating | Functional and fail-closed, but `/admin/*` has no client-side role gate |
| Database / RLS | Strongest area. 100% RLS coverage, all SECURITY DEFINER functions pin `search_path` |
| Role model | **Fragmented — three parallel role surfaces.** Highest-severity finding |
| Edge functions | 157 exist, ~80 bypass the shared `createHandler` contract, ~90% orphaned |
| AI | Real, single-provider (Gemini via Lovable Gateway), server-side only |
| MCP | **Mislabelled** — a catalog + credential store, no protocol implementation |
| RAG | **Stubbed** — pgvector RPC exists but is orphaned; no embeddings ever generated |
| Omniverse / DSX | Deliberately disabled / stubbed transports |
| Tests | 1500 tests, 239 failing (32% of files) |
| CI | **Non-functional** — workflows call npm scripts that do not exist |
| Observability | None. `console.*` only |

---

## 2. Frontend

- React 18.3.1, Vite 5.4.19, Tailwind 3.4.17, Zustand 5.0.8, react-router-dom 6.30.1,
  @tanstack/react-query 5.83.0.
- 47 pages, ~55 routes across multiple gated shells (`App.tsx` -> `AuthenticatedShell.tsx`,
  plus a decoupled `PilotLayout`).
- `tsconfig.app.json` sets `strict: false` project-wide. `tsgo --noEmit` is clean, but only because
  strictness is off; 180 `as any` casts in `src/` absorb the remaining unsoundness.
- Duplicate/near-duplicate modules: `src/context/` vs `src/contexts/`;
  `recommendationStore.ts` vs `recommendationsStore.ts`; `src/simulation/compat/` alongside the new
  `providers/` abstraction with a legacy `SimulationEngine` still exported.
- Runtime probe: unauthenticated users are correctly redirected off internal routes, but identical
  paths are declared in both the unauthenticated and authenticated routers, and query duplication
  (no shared caching) is observable in the network trace.

## 3. Auth, authorization and routing

Flow: `supabase.auth.getSession()` -> `profiles.is_approved` -> `RBACContext` resolution ->
`internal` (row in `user_roles`) gets `AuthenticatedShell`, `pilot` (approved, no role) is sealed into
`/pilot/*`, `error` renders `AuthorizationError` (fail-closed — correct).

**Finding A1 [HIGH] — Fragmented role model.** Three non-aligned surfaces:

1. DB enum `app_role` = `{executive, manager, engineer, security_admin}`.
2. `user_roles.role` is **`text`, not the enum**; live data is `engineer` (15) and `admin` (5) —
   `admin` is not in the enum at all.
3. `RBACContext.tsx` declares a 10-value TS union; 6 of those roles can never exist in the DB.

RLS policies split across the two admin concepts: `profiles`, `data_centre_twins`,
`onboarding_submissions` gate on `check_user_has_role(uid,'admin')` (free text), while `audit_logs`,
`integrations`, `role_change_audit` gate on `has_role(uid,'security_admin'|'executive')` (enum).
A `security_admin` therefore cannot approve users, and an `admin` cannot read audit logs.
`RBACContext` also reads only the first `user_roles` row (`.limit(1)`), so multi-role users get a
nondeterministic client role.

**Finding A2 [HIGH] — Single control protects self-approval.** The `profiles` UPDATE policy is
`auth.uid() = user_id` with no column restriction. Only the `enforce_profile_immutable_columns`
trigger blocks `UPDATE profiles SET is_approved = true`. That trigger hardcodes `role = 'admin'`
rather than reusing `has_role()`. Drop or regress the trigger and any authenticated user can
self-approve and be auto-granted `engineer` by `on_profile_approved_grant_default_role`.

**Finding A3 [MED] — `/admin/*` routes have no role gate** in `AuthenticatedShell.tsx`; any internal
user can reach `AdminUserApproval`. Data is protected by RLS, but the surface leaks.

**Finding A4 [LOW] — SSO and MFA are stubs.** `SSOButtons` fire `toast.info("coming soon")`;
`MFA.tsx` is a static six-digit UI with no `auth.mfa.*` calls. Only password auth is live, with
sessions in `localStorage`.

## 4. Database

- 30 migrations, `20251209160634` -> `20260805205309`. One 7,912-line baseline dump; one 0-byte dead
  file (`20260805201525`).
- **RLS: 100% coverage.** Zero tables with RLS disabled; zero tables enabled with no policies.
- All 27 `SECURITY DEFINER` functions set `search_path` — no injection surface.
- `admin_assign_role` / `admin_revoke_role` are well designed: caller re-checked, self-demotion
  blocked, writes to `role_change_audit`.
- **Finding D1 [MED] — anon-readable internal data.** `content_embeddings`, `recommendations`,
  `sites`, `site_pages`, `site_crawls`, `search_analytics` and two cache tables carry `USING(true)`
  policies reachable by `anon`.
- **Finding D2 [LOW-MED] — empty audit trails.** `role_change_audit` and `policy_audit` have 0 rows
  despite live write paths; `audit_logs` has 415.
- **Finding D3 [LOW] — `profile-images` bucket is `public = true`**, so its SELECT policy is moot for
  GET. Acceptable for avatars; should be documented as intentional.
- Defense-in-depth note: `anon` holds default Supabase table GRANTs almost everywhere, so every RLS
  policy is a hard, unbacked boundary.

## 5. Backend / edge functions

- 157 functions. ~76 use the shared `createHandler` contract; ~80 bypass it, producing inconsistent
  auth, CORS and logging.
- ~90% are orphaned — directories exist with no caller in `src/`.
- Live, wired paths: `copilot-stream` (SSE), `copilot-chat`, `dsx-ingest`, `catalog-mcp`,
  `arcade-servers`, the Zapier cluster (17 functions), `rag-*` CRUD.

## 6. AI, MCP, RAG, Co-Pilot

**AI — implemented.** Every call funnels through the Lovable AI Gateway
(`ai.gateway.lovable.dev/v1/chat/completions`) with `LOVABLE_API_KEY`, model
`google/gemini-3-pro-preview` (fallback `google/gemini-3.0-pro`). No OpenAI/Anthropic/NVIDIA
integration exists. The browser never holds the key — correct separation. The external Vertex path in
`_shared/ai-client.ts` throws `Not yet implemented`.

**MCP — mislabelled [HIGH for accuracy of claims].** Zero repo hits for `modelcontextprotocol`,
`jsonrpc`, `tools/list`, `tools/call`, or `initialize`. `mcp-test-tool` POSTs to
`{endpoint}/tools/{name}` — a bespoke REST convention, not JSON-RPC. `mcp-connect` only stores
credentials. `mcpServersStore` reads `arcade-servers`, which returns hardcoded `MOCK_SERVERS` when
`ARCADE_API_KEY` is absent. This is a connector catalog wearing MCP vocabulary.

**RAG — stubbed/disconnected.** `match_documents(query_embedding, ...)` exists in Postgres but has
**no caller anywhere**. `rag-upload` validates a 50 MB limit, inserts `status:'queued'`, discards the
bytes, and carries a comment listing the six pipeline steps that were never built. What the UI calls
"grounding" is a flat `SELECT * FROM knowledge_sources LIMIT 6` concatenated into the prompt, with
citation URLs hardcoded to `''`.

**Co-Pilot — implemented, read-only.** `CoPilotContext` -> `streaming.ts` -> `copilot-stream` (SSE),
with real event logging into `copilot_events`. It touches only `copilot_memory`; it cannot mutate
business records. `generate-workflow` and `run-simulation` in `copilot-router` are TODO stubs, and
`generateSuggestions()` returns rule-based canned text presented alongside model output. No
confirmation gates exist because no mutation capability exists yet.

## 7. Integrations and storage

| Integration | Status |
|---|---|
| Supabase | Live |
| Lovable AI Gateway (Gemini) | Live, server-side |
| Zapier (17 functions, OAuth2) | Configured |
| Arcade | **Mocked** by default |
| NVIDIA Omniverse Kit | **Disabled by design** — `enabled: false` hardcoded, no env read |
| DSX Exchange (MQTT/NATS) | **Stubbed** — transport interface only, no live broker |
| Google Vertex (direct) | Throws `not yet implemented` |
| Email / SMS / Maps / Analytics | Absent |

Storage: the only real `supabase.storage` usage is `use-profile-upload.ts` against `profile-images`.
Document/attachment storage for RAG does not exist.

## 8. Tests, CI/CD, observability

Measured, not claimed:

```
vitest run    -> 168 failed | 77 passed (245 files); 239 failed | 1152 passed | 109 skipped (1500 tests)
tsgo --noEmit -> exit 0, 0 errors (strict mode is off)
eslint .      -> 1470 problems (1333 errors, 137 warnings)
```

Failures include genuine regressions, e.g. `normalizeCompanyName` truncating "My Health System" to
"My", and a 5s timeout importing `src/simulation/index.ts`.

**Finding C1 [HIGH] — the CI unit-test gate does not run.** `test.yml` and `qa-suite.yml` invoke
`npm run test:unit` and `npm run test:unit:coverage`. Neither script exists in `package.json`
(only `dev, build, build:dev, lint, preview, test:a11y, verify:dsx-phase7`). These jobs fail at the
`npm run` step on every PR. No workflow runs lint or typecheck at all, so the 1470 lint problems are
structurally unenforceable.

Seven workflows exist (`test`, `qa-suite`, `dsx-audit-chain`, `production-perimeter`,
`seo-validation`, `visual-regression`, `yvr-regression`). No IaC, no migration gate, no rollback
workflow. `seo-validation.yml` hardcodes the production URL.

**Observability: none.** 762 `console.*` calls in `src/`, 546 in `supabase/functions/`, unstructured
and without correlation IDs. Sentry/OTel/PostHog appear only in a test *block*-list. Production root
cause analysis currently means reading raw platform logs.

Six Playwright configs exist; `crossbrowser`/`drawer-sequence` and `builder`/`settings` are
copy-pasted pairs differing only in `testMatch`/`testDir`. `cypress/` holds one orphaned spec.
Note that `tests/truth-in-ui/_setup/network-guard.ts` aborts all Supabase traffic — that suite
validates UI wiring only and never exercises auth, RLS or edge functions.

## 9. Architectural debt register

| Item | Evidence |
|---|---|
| Three lockfiles | `bun.lock`, `bun.lockb`, `package-lock.json` all present; CI uses `npm ci` |
| 84 loose status `.md` files at repo root | e.g. 6 x `DIGITAL_TWIN_PHASE*_COMPLETE.md` |
| Duplicate context dirs | `src/context/` (4 files) + `src/contexts/` (4 files) |
| Duplicate stores | `recommendationStore.ts` + `recommendationsStore.ts` |
| Mid-flight simulation refactor | `compat/` + `providers/` + legacy `SimulationEngine` export |
| 6 Playwright configs, 2 copy-paste pairs | identical headers, differing only in matcher |
| ~140 orphaned edge functions | no caller in `src/` |
| 180 `as any` in `src/` | strict mode off |

## 10. Prioritized remediation

**P0 — correctness and security of the authorization model**

1. Unify the role model: migrate `user_roles.role` to the `app_role` enum, add `admin` to the enum or
   map it to `security_admin`, retire the 6 phantom TS roles, and make every RLS policy use one helper.
2. Replace the `profiles` UPDATE policy with a column-restricted policy so the immutability trigger is
   defense-in-depth rather than the sole control.
3. Fix the CI gate: add the missing `test:unit*` scripts, add lint and typecheck jobs, and make
   `qa-summary` fail on them.

**P1 — truth in claims**

4. Either implement real MCP (JSON-RPC transport, `initialize`/`tools/list`/`tools/call`) or rename the
   surface to "Connectors" and remove MCP terminology from UI and docs.
5. Either build the RAG pipeline (storage -> chunk -> embed -> `match_documents`) or mark the upload
   surface unavailable; today it silently discards user files.
6. Add role gating to `/admin/*` routes.

**P2 — operability**

7. Install Sentry (or OTel) and replace ad-hoc `console.*` in edge functions with the shared handler's
   structured logger; migrate the ~80 non-conforming functions onto `createHandler`.
8. Fix the 239 failing tests, starting with the real `normalizeCompanyName` regression.
9. Review the eight anon-readable tables and close any not intended as public product data.

**P3 — hygiene**

10. Delete two of three lockfiles, merge `src/context` into `src/contexts`, consolidate the duplicate
    recommendation stores and Playwright configs, remove `cypress/`, prune orphaned edge functions,
    and move the 84 root status docs under `docs/`.
11. Enable TypeScript strict mode incrementally and burn down the 180 `as any` casts.

# AURA Full Implementation Audit - 2026-08-17

Evidence-based, all checks executed against the current working tree.

## Verdict
AURA_IMPLEMENTATION_AUDIT_PASS_WITH_DEFECTS - the platform builds, typechecks and is
RLS-complete, but one truth-suite test fails and several hygiene/perf items remain open.

## Evidence

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | tsc -p tsconfig.app.json --noEmit | PASS, 0 errors |
| Unit + integration tests | vitest run | FAIL: 1 failed / 1634 passed / 91 skipped (161 files) |
| Production build | vite build | PASS, 19.6s |
| SEO gate | build-time validator | PASS, 0 errors / 0 warnings |
| ESLint | eslint . | 1445 problems (1292 errors, 153 warnings) - mostly no-explicit-any |
| Database RLS | pg_class / pg_policies | 131 public tables, 0 with RLS off, 0 with RLS on and no policy |
| Security scanner | run_security_scan | 7 findings, all `warn`, 0 critical |
| Edge functions | supabase/functions | 166 functions, 1 with verify_jwt=false (dsx-ingest, in-code token verification) |

## P1 - failing truth gate

`src/data/dataset/__tests__/surfaceCoverage.test.ts > classifies every declared route`

Two authenticated routes are declared in the shell but absent from
`src/data/dataset/surfaceRegistry.ts`:

- `/manage/connections` (Connections & Data Exchange control plane)
- `/admin/platform-readiness`

Impact: while `?dataset=nvidia-dsx-reference` is active these surfaces have no
classification, so the reference canary cannot decide whether to mount the legacy
component or a reference-only surface. They must be classified explicitly
(`DATASET_NEUTRAL` for the connections control plane and the admin readiness page is
the likely correct answer, since neither renders facility reference records).

## P2 - security findings (all warn, none critical)

1. `asset_canary_events` - SELECT policy `USING (true)`; any authenticated user can read
   internal rollout/rollback history and actor IDs. Write policy is already admin-scoped.
2. `connector_definitions` and `connection_data_contracts` - SELECT `USING (true)`; internal
   integration schema readable org-wide, not tenant-scoped like the rest of the
   connections control plane.
3. `agent_suggestions_cache` - anonymous read of cached query text.
4. `contact_expert_logs` - authenticated INSERT permits `user_id NULL`.
5. `onboarding_submissions` - anonymous INSERT with no abuse protection (SELECT is admin-only).
6/7. SECURITY DEFINER functions executable by anon/authenticated (one already dismissed by the user).

No table is unprotected, no anonymous read of provider credentials, and no critical finding.

## P2 - carried critical defect from the previous phase

`supabase/functions/rag-oauth-google` still performs its own Google OAuth and token
exchange and would write raw access and refresh tokens unencrypted into
`public.rag_tokens`. That table is RLS-on, has no anon/authenticated grants and holds
zero rows, so there is no live exposure, but the path is a parallel OAuth implementation
and must be deleted or migrated onto the managed connector before pilot.

## P3 - performance and hygiene

- `AuthenticatedShell` chunk is 2.49 MB (633 kB gzip) and `index` is 1.5 MB; total
  `dist/assets` 6.8 MB. The shell should be route-split.
- 1292 ESLint errors, dominated by `@typescript-eslint/no-explicit-any`; 25 auto-fixable.
- 91 skipped tests and 9 skipped files - skip reasons are backend-gated CI stability, but the
  skipped set is not currently reported anywhere.
- 80+ top-level `*_AUDIT*.md` / `*_COMPLETE.md` reports in the repository root; superseded
  documents should move under `docs/`.

## Not verified in this pass

Playwright suites (truth, a11y, GPU, deeplink, crossbrowser) were not executed here; the
last recorded runs are green but predate the connections control plane work.

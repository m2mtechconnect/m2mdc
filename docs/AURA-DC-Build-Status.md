# AURA DC — Build Status

Baseline commit: `6f6a502be599cd43eb8bc51c2f329cabf30541b7`
Branch: `edit/edt-03cdebae-12f4-4eea-8ab8-a620694f0a5f`
Runtime: Node v22.22.0
Last updated: 2026-08-07 UTC

Status vocabulary: PROVEN | IMPLEMENTED | CONFIGURED | MOCKED | STUBBED | DISCONNECTED | BROKEN | PLANNED | UNKNOWN

## Phase 0 — Baseline and containment (IN PROGRESS)

### Completed work
| Item | Before | After | Status |
|---|---|---|---|
| Fabricated RAG answers/citations/token counts (`rag-test`) | MOCKED, presented as real | Grounded failure, HTTP 501, no synthetic content | IMPLEMENTED |
| RAG uploads discarding bytes while reporting success (`rag-upload`) | BROKEN (misleading `queued` row) | Honest rejection, HTTP 501, nothing persisted | IMPLEMENTED |
| CI invoking nonexistent npm scripts | BROKEN | `test`, `test:unit`, `test:unit:coverage`, `test:int`, `test:e2e`, `test:e2e:record`, `test:coverage`, `typecheck`, `db:seed:studio` defined | IMPLEMENTED |
| Vitest collecting Playwright specs | BROKEN (~122 false failures) | Explicit include/exclude; Playwright owns `tests/e2e`, `tests/truth-in-ui`, `tests/visual`, `tests/builder`, `tests/settings` | PROVEN |

### Changed files
- `supabase/functions/rag-test/index.ts`
- `supabase/functions/rag-upload/index.ts`
- `package.json`
- `vitest.config.ts`
- `docs/AURA-DC-*.md` (new)

### Tests executed
| Command | UTC | Exit | Result |
|---|---|---|---|
| `npx vitest run` | 2026-08-07 14:10 | 0 (reporter) | 114 files: 74 passed / 40 failed; 1430 tests: 1097 passed / 224 failed / 109 skipped |

Corrected test baseline: **224 genuine unit/integration failures**. The previously
reported 239 included ~122 Playwright specs mis-collected by Vitest; those are now
excluded and the remaining failures are real defects, not harness noise. No test was
deleted or skipped to improve the count.

### Runtime evidence
- RAG containment verified by source inspection; both functions return HTTP 501 with
  `capability_status: "STUBBED"` and empty `citations`/`items`. Existing UI call sites
  (`src/components/rag/RAGPanel.tsx`, `src/components/rag/RAGUploadTabs.tsx`,
  `src/lib/apiClient.ts`) already surface non-2xx responses as error toasts, so the
  failure is visible to users rather than silent.

### Known limitations
- Anonymous read access on `sites` and `dc_blueprint_templates` is NOT yet closed.
- Synthetic telemetry labelling audit is NOT yet complete.
- Conflicting role systems (`RBACContext` vs `useUserPermissions`) untouched.
- `has_role(uuid, app_role)` type mismatch still breaks 10 RLS policies.

### Remaining blockers
See `docs/AURA-DC-Implementation-Plan.md` §Blockers.

### Next phase
Phase 0 remainder: anonymous access containment, synthetic-data labelling, misleading
operational copy. Then Phase 1 (security and data foundation).

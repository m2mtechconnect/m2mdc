# DSX Read-Only Foundation — Sub-slice 1 Verification

All commands executed inside the AURA sandbox on 2026-07-27.

## Files added

- `src/dsx/contract.ts` — canonical envelope, enums, Zod validators,
  `parseDsxEvent`, `deriveDisplayState`, `isSupportedSchemaVersion`.
- `src/dsx/index.ts` — public re-export.
- `src/dsx/__tests__/contract.test.ts` — 23 Vitest tests.
- `docs/remediation/evidence/dsx-read-only-foundation/00-audit.md` — audit + gap matrix.
- `docs/remediation/evidence/dsx-read-only-foundation/01-verification.md` — this file.

No migrations. No Edge Functions. No gateway files. No UI changes. No
existing file modified. No secret requested, committed, or fabricated.

## Commands, exit codes, durations, totals

| # | Command | Exit | Duration | Result |
|---|---------|------|----------|--------|
| 1 | `bunx vitest run src/dsx/__tests__/contract.test.ts` | `0` | 2 s (vitest self-report 1.72 s) | **23 passed / 23 total** |
| 2 | `bunx tsgo --noEmit -p tsconfig.app.json` | `0` | 5 s | 0 errors |
| 3 | `bunx eslint src/dsx/contract.ts src/dsx/index.ts src/dsx/__tests__/contract.test.ts` | `0` | 2 s | 0 errors, 0 warnings |
| 4 | `bun run build` | `0` | 26 s | production build PASS (SEO gate PASS, 0 errors, 0 warnings) |
| 5 | `bunx playwright test --config=playwright.builder.config.ts` | `0` | 41 s | **2 passed / 2 total** — builder-success + builder-failure-retry |
| 6 | `bunx playwright test --config=playwright.settings.config.ts` | `0` | 16 s | **1 passed / 1 total** — settings-ai |

### Vitest test names (23)

`DsxEventEnvelopeV1Schema`: accepts well-formed; rejects unknown fields
(strict); rejects malformed timestamps; rejects future-drift timestamps;
rejects unknown units; accepts null value/unit/asset_id.

`parseDsxEvent — fail-closed`: not_an_object for primitives/arrays/null;
missing_schema_version; unsupported_version explicit; unsupported_version
for string version; schema_invalid with Zod issues; ok echoes envelope.

`isSupportedSchemaVersion`: accepts every listed version; rejects
everything else.

`deriveDisplayState`: LIVE when everything holds; STALE when observation
exceeds freshness budget; STALE when quality is degraded; INVALID for
every non-accepted validation_state (4 cases); INVALID when quality
invalid; UNAVAILABLE when mapping unmapped or ambiguous; UNAVAILABLE when
value null (never coerced to 0); UNAVAILABLE when connection is not
connected (4 cases: connecting, degraded, disconnected, disabled);
UNAVAILABLE when quality unavailable.

### Regression specs (baseline intact)

- `tests/builder/builder-success.spec.ts` — 1 test, PASS (21.5 s).
- `tests/builder/builder-failure-retry.spec.ts` — 1 test, PASS (15.2 s).
- `tests/settings/settings-ai.spec.ts` — 1 test, PASS (12.4 s).

### Secret safety

`git ls-files` shows no new `.env`, no DSX credentials, no service-role key
committed. `src/dsx/` contains only pure TypeScript / types / validators —
no network calls, no `import.meta.env` reads.

## What is NOT in this sub-slice

- No `services/dsx-gateway/` directory (Phase 3).
- No `dsx-ingest` Edge Function (Phase 2).
- No migrations (Phase 2).
- No UI wiring (Phase 5).
- No live DSX connection (external blocker — no authorized endpoint / credentials).

## Verdict

**AURA DSX READ-ONLY FOUNDATION PARTIAL — PHASE 0 AUDIT AND PHASE 1
CANONICAL CONTRACT COMPLETE; APPLICATION INGESTION, GATEWAY, MAPPING, UI
AND LIVE DSX CONNECTIVITY REMAIN.**
# AURA DC — Testing Strategy

## Layers
| Layer | Tool | Location | Gate |
|---|---|---|---|
| Unit | Vitest | `src/**`, `tests/unit` | `npm run test:unit` |
| Integration | Vitest | `tests/integration` | `npm run test:int` |
| End-to-end | Playwright | `tests/e2e` | `npm run test:e2e` |
| Truth-in-UI / a11y | Playwright + axe | `tests/truth-in-ui` | `npm run test:a11y` |
| Visual | Playwright | `tests/visual` | dedicated workflow |

Vitest and Playwright no longer overlap: `vitest.config.ts` explicitly excludes
`tests/e2e`, `tests/truth-in-ui`, `tests/visual`, `tests/builder`, `tests/settings`
and `tests/_harness`.

## Corrected baseline (2026-08-07, commit 6f6a502)
`npx vitest run` → 114 files (74 passed / 40 failed); 1430 tests
(1097 passed / **224 failed** / 109 skipped).

The previously reported 239 failures included ~122 Playwright specs mis-collected by
Vitest. The 224 remaining failures are genuine defects. Failures are fixed, never
deleted or skipped, and the count is reported honestly each phase.

## Rules
- No test is deleted or skipped to make a gate pass.
- A capability is PROVEN only when an automated test executes it and passes.
- Local adapters may support tests but never substitute for production integration proof.

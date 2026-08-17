# Playwright results

| Suite | Status | Notes |
| --- | --- | --- |
| Targeted published anonymous route sweep (11 routes) | PASS | 0 console errors, redirects fail-closed |
| Targeted published authenticated sweep (7 routes) | PARTIAL | 3 routes 404 on the stale published bundle; all pass on the current build |
| Same sweep against current build (7 routes) | PASS | 0 console errors |
| Full published Playwright suite (`playwright.config.ts`) | NOT RUN | requires a republished host to be meaningful; the current published bundle predates the routes under test |
| `playwright.truth.config.ts` | NOT RUN | `BLOCKED_UNVERIFIED` |
| a11y / axe suite | NOT RUN | `BLOCKED_UNVERIFIED` |
| GPU matrix (`playwright.gpu.config.ts`) | NOT RUN | requires hardware-accelerated browser and an administrator operator |
| Deeplink / crossbrowser suites | NOT RUN | `BLOCKED_UNVERIFIED` |

Raw sweep output: `sweep.json`, `auth_sweep.json`, `local_sweep.json`.

Not-run suites are counted as not run. None of them is reported as passing.

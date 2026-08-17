# Deferred P3 backlog (not touched in this phase)

| # | Item | Priority | Suggested owner | Notes |
| --- | --- | --- | --- | --- |
| P3-1 | Route-split `AuthenticatedShell` (2.49 MB chunk, 633 kB gzip) | High | Platform frontend | Largest single delivery cost; `index` is a further 1.5 MB |
| P3-2 | 1292 ESLint errors, dominated by `@typescript-eslint/no-explicit-any` (25 auto-fixable) | Medium | Whole team, per-module | Do not bulk-cast to silence; type the modules |
| P3-3 | Large-scale `any` removal in domain and simulation modules | Medium | Simulation / connections owners | Follows P3-2 |
| P3-4 | 80+ stale `*_AUDIT*.md` / `*_COMPLETE.md` files in the repository root | Low | Docs owner | Move under `docs/`; define retention and archival rules first - no historical evidence is to be deleted before then |
| P3-5 | Report the 91 skipped tests in CI output | Low | CI owner | Currently invisible outside a local run |
| P3-6 | Run the full Playwright suite matrix post-connections work | Medium | QA | truth, a11y, GPU, deeplink, crossbrowser |

# Phase 13 - Quality Closure and Lint Remediation

## Objective
Close the quality gate left open by the Phase 0 baseline: a repository that could
not be linted cleanly, contained genuine correctness defects hidden inside the
noise, and had no policy preventing regression in the truth-critical modules
built during Phases 1-12.

## Baseline vs. outcome

| Gate | Phase 0 baseline | Phase 13 |
| --- | --- | --- |
| ESLint errors | 1288 | 0 |
| ESLint warnings | 150 | 1347 (all `no-explicit-any`, counted not silenced) |
| TypeScript (`tsgo --noEmit`) | clean | clean |
| Vitest | 1840 passing | 1840 passing, 0 failing |

## Correctness defects fixed (not cosmetic)

1. **Unparseable E2E spec** - `tests/e2e/aura-regression-suite.spec.ts` declared
   `const failed Requests`, a syntax error. The file had never been parsed by
   lint or executed meaningfully.
2. **Conditional React hooks** - `EnterpriseKPICard.tsx` and
   `NetworkTopologyLayer.tsx` returned before hook calls, violating the rules of
   hooks and risking state corruption on re-render. Early returns were moved
   below all hook calls.
3. **Unsafe `Function` listener registries** - three simulation engines
   (`BuilderPreviewEngine`, `builderMock`, `enhancedSimulationEngine`) typed
   their event registries as `Function[]`. Replaced with a single documented
   `AnyEventListener` alias so the public `on(...)` overloads remain the
   enforcement point.
4. **`require()` in ESM source** - `simulationMockData.ts` loaded the Transport
   Canada scenarios through `require()` inside a `try/catch`, silently swallowing
   any load failure. Converted to a static import with an explicit empty-result
   fallback. `tailwind.config.ts` and `tests/e2e/compliance.spec.ts` were
   likewise converted to ESM imports.
5. **Silent empty catches** - guarded deletes in `WorkflowEditor.tsx` and
   best-effort steps in three edge functions now carry explicit rationale
   comments instead of `catch {}`.
6. **`@ts-ignore` -> `@ts-expect-error`** - suppressions in the Deno edge
   functions and one Playwright spec now fail if the underlying error disappears.
7. **Case-block scoping** - `no-case-declarations` violations across 7 files
   (including `HeroSearchBar.tsx` and `marketplaceStore.ts`) were resolved by
   scoping declarations to their case blocks, removing real cross-case leakage.

## `no-explicit-any` ratchet policy

The baseline carried 1202 `any` uses. Erasing them wholesale is not a mechanical
change and would have obscured the correctness fixes above, so `eslint.config.js`
now applies a ratchet:

- Repo-wide: `warn`. Every occurrence stays visible and counted; none are
  disabled or ignored.
- `error` in the truth-critical modules consolidated during Phases 1-12:
  `src/dsx/**`, `src/workspace/**`, `src/telemetry/**`, `src/connections/**`,
  `src/validation/**`, `src/config/**`. New code in these paths cannot
  reintroduce `any`; an untyped value here can hide a provenance, ownership, or
  data-mode defect.
- Test files and Cypress specs are exempted where they model untyped
  third-party surfaces or use chai assertion expressions.

The three surviving `any` uses inside escalated directories are single-point,
explicitly disabled with a written rationale, and confined to dynamic Postgrest
query builders whose row shapes are narrowed at each call site.

## Residual debt
1347 `no-explicit-any` warnings remain in legacy surfaces outside the escalated
directories. They are tracked by the ratchet and should be burned down
file-by-file as those surfaces are next touched.

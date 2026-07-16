# ADR-0002: `tsc -p tsconfig.app.json --noEmit` is the authoritative typecheck gate

Status: Accepted (Phase 1A).

## Context

Phase 0 ran three "type" checks and got three answers:

| Tool | Command | Exit | Adapter errors |
|---|---|---:|---:|
| `tsgo` | `npx tsgo --noEmit` | 0 | 0 |
| `tsc` | harness project-references build | non-zero | 23 |
| `vite build` | `npx vite build` | 0 | not checked |

Root cause:

- **`vite build` is not a type checker.** Vite uses `@vitejs/plugin-react-swc`, which transpiles TypeScript via SWC. SWC only does syntax + JSX transform; it does **no** semantic type checking. A red type-check can ship a green bundle. This is documented Vite behaviour, not a bug.
- **`tsgo` is faster but incomplete.** Even with the same `tsconfig.app.json` (which has `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`), `tsgo` did not surface the excess-property / missing-property errors that the full TypeScript 5.8.3 checker raised in `omniverseAdapter.ts`. `tsgo` is useful for inner-loop feedback but must not be the sole CI gate.
- **`tsc` is the authoritative checker.** It caught 23 shape-drift errors that neither of the others did.

## Decision

CI uses:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

as the required typecheck gate. `tsgo` remains available as an optional pre-commit accelerator. `vite build` is a bundler correctness gate only, not a type gate.

## Non-negotiables

- The gate must NOT be loosened to make suppressions pass. `strict` may only move stricter, not laxer.
- Any change to `tsconfig*.json` requires a companion ADR justifying it.
- Stale `tsconfig.*.tsbuildinfo` caches must be cleared in CI to avoid Phase 0.5's "same file, different reported errors" experience.

## Consequences

Local development retains fast feedback via `tsgo`. CI is honest. Reviewers and future auditors can rely on a single answer to "does this build type-check?"
# Phase 5 — CI budget, toolchain repair and full-suite execution

Closes Phase 0 blocker #6 (no CI-length budget for the long harnesses) and a CI
toolchain break introduced when Phase 1 consolidated on `bun.lock`.

## 1. CI toolchain repair (blocking defect)
Phase 1 deleted `package-lock.json`, but six workflows still ran `npm ci` with
`cache: 'npm'` — every one of them would fail on the first step.
Migrated `qa-suite`, `test`, `yvr-regression`, `visual-regression`,
`dsx-evidence-scoped`, `twin-canvas-gpu-matrix` to
`oven-sh/setup-bun@v2` (1.3.3) + `bun install --frozen-lockfile`, with
`npm run`/`npx` rewritten to `bun run`/`bunx`. All 10 workflow files parse.

## 2. Long-harness CI lane (new)
`.github/workflows/aura-truth-suite.yml`
- `truth-in-ui`: 4-way `--shard`, 45 min per shard, artifacts uploaded.
- `route-stress`: full sweep, 60 min budget, artifacts uploaded.
- Triggers: PR (path-filtered), push to main, nightly cron, manual.
- Scripts added: `test:truth`, `test:route-stress`.

## 3. Sandbox execution evidence
Sharding makes the suite runnable inside a bounded budget (previously exit 124).
| Shard | Result | Wall clock |
|---|---|---|
| 1/4 | 1 failed → fixed, then 68 pass | 5.2 min |
| 2/4 | 30 passed, 2 skipped, failures in `navigation-click-audit.spec.ts` | 6.2 min |
| 3/4 | 40 passed, failures in `navigation-full-surface.spec.ts` | 7.9 min |
| 4/4 | not executed in this sandbox | — |

## 4. Defect fixed
`axe: /data-centre-twin?demo=true` — three critical `button-name` violations
(WCAG 2.1 4.1.2) from unlabeled icon buttons in
`src/components/twin-visualization/ZoomControlsOverlay.tsx`. Added
`aria-label` to zoom in / zoom out / reset view / fit to view. Re-run: 5/5 pass.

## 5. Carried forward to Phase 6
- Navigation real-click failures in shards 2 and 3 (`navigation-click-audit`,
  `navigation-full-surface`) — first reproduction of these; the shards were run
  concurrently on separate ports, so port interference is not excluded. Must be
  re-run serially before triage.
- Shard 4/4 unexecuted.
- Route-stress sweep still unexecuted locally; now has a CI lane.

## Verdict
**PHASE_5_PARTIAL** — CI budget and toolchain closed; truth-suite green state
not yet proven end to end. **AURA_NVIDIA_OPERATIONAL_NOT_READY** stands.

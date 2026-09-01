# Root-cause plan: two reproducing truth-in-UI failures (HEAD a1bbc8e2)

Read-only analysis. No files edited, no deploy, no publish, and the isolated DSX job was not touched.

## Failure 1 — cold `/dashboard` meaningful marker 8189.77 ms vs 6000 ms budget

### What the code actually does
- `playwright.truth.config.ts` `webServer` starts **`npx vite --port <PORT> --strictPort`** — an unbundled **dev** server. No `build` + `preview` path exists for this suite.
- `tests/truth-in-ui/authenticated-performance.spec.ts` opens a **fresh page per route** (`context.newPage()`), navigates, and measures wall time until `getByTestId('facility-highlights') h1` is visible. `/dashboard` is the **first** route in `CURRENT_AUTHENTICATED_ROUTES`, so it absorbs the entire first-request cost.
- The dashboard route is `lazy(loadDashboard)` in `src/AuthenticatedShell.tsx:30`; the marker lives deep in `src/workspace/CommandCentre.tsx` → `src/workspace/dashboard/FacilityHighlights.tsx`. On a cold dev server this route pulls a large module graph that Vite must transform on demand, request by request, before React can commit.
- The recorded evidence is consistent with this: FCP passed (< 3000 ms — the shell painted early) while the meaningful marker landed 5+ s later. That gap is module-graph acquisition, not a data wait; the Supabase mock is in-process and the network guard blocks egress.

### Mechanism
**Test harness / cold dev compilation.** The budget is a production readiness budget, but it is measured against a dev server's first-request transform cost. This is not evidence of a product regression, and it is also not evidence of product health — the gate currently measures the wrong artifact.

Not the mechanism: blocked network (guard would fail the test), continuous rendering (TBT and CLS assertions passed), or an auth/loader stall (`Loading workspace...` count assertion passed).

### Smallest fix that preserves the meaningful-readiness invariant
Measure the budget against a **production artifact**, keeping every budget number, marker and assertion byte-identical.

1. Add `playwright.perf.config.ts` that reuses the truth `use` block and fixtures but sets
   `webServer.command = 'vite build && vite preview --port <PORT> --strictPort'` with the same safe loopback env
   (`VITE_SUPABASE_URL=http://127.0.0.1:54321`, placeholder anon key, bogus Kit URL), `testMatch: authenticated-performance.spec.ts`, `timeout` raised only to cover the build-free run duration already used by the spec (`test.setTimeout(90_000)` stays in-spec).
2. Exclude `authenticated-performance.spec.ts` from `playwright.truth.config.ts` (`testIgnore`) so the functional shards no longer run a perf gate against dev output.
3. Add script `test:perf` and wire it into the release qualification list next to `test:truth`.

Explicitly **not** doing: raising `BUDGETS`, adding sleeps/warmups, retries, or excluding `/dashboard`.

### Predictive defect family (analogous consumers)
Every consumer that asserts a **timing** budget against the dev server inherits the same false signal:
- `authenticated-performance.spec.ts` second test (`warmPrimaryNavigationMs`, 3500 ms) — same file, same config move.
- `tests/truth-in-ui/predictive-ux-regressions.spec.ts` and `twin-canvas-mounting.spec.ts` — audit for wall-clock budgets; move any that exist into the perf config in the same change.
- Non-timing specs stay on the dev config unchanged.

## Failure 2 — `axe-contrast-focus.spec.ts` `data-centre-twin (demo)` exceeds the 20 s test timeout inside `probeFocusIndicators`

### What the code actually does
- `playwright.truth.config.ts` sets a **global 20 s test timeout**.
- In `tests/truth-in-ui/axe-contrast-focus.spec.ts`, the **authed** describe block sets `test.setTimeout(60_000)` (line 298). The **public** describe block (line 273), which owns `data-centre-twin (demo)` and `twin-preview`, sets **no per-test timeout** — it runs on 20 s.
- That surface is the heaviest public route: `/data-centre-twin?demo=true` → `PublicAppRoutes.tsx:56` → `src/pages/PublicDataCentreTwin.tsx` mounts `RBACProvider` + `ActiveTwinProvider` + `CoPilotProvider` + `CoPilotCommandProvider` around `src/pages/DataCentreTwin.tsx`, with `mockKit(page, 'network-unavailable')` forcing the Kit-unavailable branch.
- The single test body performs, serially: cold dev-server route load, a `networkidle` wait, a **full axe `color-contrast` pass over the whole DOM**, then `probeFocusIndicators` which awaits **one `requestAnimationFrame` per element for up to 12 elements** inside a single `page.evaluate`.
- The probe has **no per-element deadline and no rAF fallback**. If any single `rAF` is delayed (long frame from the twin surface, or a frame that never schedules), the whole `evaluate` hangs with **no evidence of which element stalled**.

### Mechanism (stated honestly)
Two mechanisms are in play and only the first is proven from the code:
1. **Proven — harness budget asymmetry.** The heaviest public surface runs the full contrast + focus audit under a 20 s cap while lighter authed surfaces get 60 s, on top of cold dev compilation (Failure 1's mechanism).
2. **Unconfirmed — a stalled/long frame inside the probe.** The timeout landed inside `page.evaluate`, but the probe emits nothing on stall, so we cannot currently name the element or distinguish "slow frames" from "rAF never fired". **Do not assert a product defect until step 1 below produces the evidence.**

### Smallest fix that preserves the visible-focus invariant
1. **Instrument first (evidence, not a workaround).** Make the probe fail *loudly* instead of hanging: give each element a bounded wait implemented as `Promise.race([rAF, setTimeout(budget)])`, and when the fallback wins record `{ selector, reason: 'focus frame did not commit within Nms' }` as a **failure**, plus attach per-element elapsed timings. Sample count stays 12; no assertion is weakened — a stall becomes a named, blocking failure with a selector.
2. **Re-run the isolated `data-centre-twin (demo)` case** on port 8094-class isolation and read the named stall.
3. **Then fix the proven owner**: if a specific control on the twin surface stalls the frame (canvas/telemetry work, or `focus()` triggering scroll into a heavy subtree), fix that component; if the run shows only cumulative slowness with all 12 elements committing, the residual cause is cold dev compilation and it is resolved by serving this suite consistently (same artifact question as Failure 1) — not by raising the timeout.
4. Do **not** add `test.setTimeout(60_000)` to the public block as the fix. It may be added only after step 3 proves the surface is genuinely heavier work rather than stalled work, and then as an explicit, commented parity with the authed block.

Explicitly **not** doing: reducing `max` samples, skipping the surface, `waitForTimeout` padding, or converting the assertion to a warning.

### Predictive defect family (analogous consumers)
The un-instrumented `await new Promise((r) => requestAnimationFrame(...))`-inside-`evaluate` pattern is duplicated in five specs, each able to hang the same way:
- `tests/truth-in-ui/axe-contrast-focus.spec.ts:190`
- `tests/truth-in-ui/radix-overlay-focus-rings.spec.ts:88,102`
- `tests/truth-in-ui/command-palette-focus-rings.spec.ts:111,160,180,191`
- `tests/truth-in-ui/overlay-focus-rings.spec.ts:101`
- `tests/truth-in-ui/dsx-keyboard-focus.spec.ts:63`
- also `tests/truth-in-ui/_setup/card-activation.ts:76,156` (rAF polling loops)

Consolidation: extract one shared helper `tests/truth-in-ui/_setup/focus-probe.ts` exporting the bounded frame wait (and, if the diff stays small, the whole `probeFocusIndicators`), and have all five specs import it. One mechanism, one place, so the next stall is self-describing everywhere.

## Affected files
- `playwright.truth.config.ts` (add `testIgnore` for the perf spec)
- `playwright.perf.config.ts` (new)
- `package.json` (`test:perf` script)
- `tests/truth-in-ui/_setup/focus-probe.ts` (new shared bounded-frame helper)
- `tests/truth-in-ui/axe-contrast-focus.spec.ts`, `radix-overlay-focus-rings.spec.ts`, `command-palette-focus-rings.spec.ts`, `overlay-focus-rings.spec.ts`, `dsx-keyboard-focus.spec.ts` (import the helper)
- Product files: **none yet** — only if step 2 of Failure 2 names a component.

## Rollback
Every change is test-harness scoped and additive: revert the branch. `playwright.truth.config.ts` returns to running the perf spec inline; the specs return to their inline rAF waits. No product, schema, auth, route, CORS, provenance or release-fingerprint surface is touched, so there is no runtime rollback.

## Qualification
```
npx tsc -p tsconfig.json --noEmit          # typecheck
npm run lint
npm run verify:architecture-governance
npm run verify:schema-truth
npm run test:unit
npm run build                              # + SEO validation
npm run verify:fast
npm run test:perf                          # new production-artifact perf gate
CI=true AURA_TRUTH_PORT=8091 npx playwright test --config=playwright.truth.config.ts --shard=1/4   # then 2/4, 3/4, 4/4
```
Each shard runs as a durable background job with an atomic exit file; a timeout, missing browser or unrun shard is BLOCKED, not passed. Report exact passed/failed/skipped counts and durations per shard, and separate pre-existing from new failures.

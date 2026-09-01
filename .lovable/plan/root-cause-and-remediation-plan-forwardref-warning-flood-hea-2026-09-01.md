# Root cause and remediation plan — forwardRef warning flood (head 0371589a)

## Named root cause

**Dev-only JSX instrumentation from `lovable-tagger` attaches a callback `ref` to every JSX element, including plain function components. React 18 then emits the "Function components cannot be given refs" warning once per unique JSX source location, on every page, in every dev-server test run.**

This is a harness/environment defect, not an application component defect. No app-owned component was proven to be the offending ref recipient.

### Evidence chain (read-only, verified this turn)

1. `node_modules/react-dom/cjs/react-dom.development.js:20196` — `validateFunctionComponentInDev` warns whenever `workInProgress.ref !== null` for a function component. The dedupe key at line 20212-20220 is `debugSource.fileName + ':' + lineNumber`, so the warning fires once **per JSX call site**, which is exactly why thousands accumulate per route rather than one per component type.
2. `node_modules/lovable-tagger/dist/index.js` (v1.3.3) ships a replacement `jsxDEV` that, for **every** element with source info, builds `enhancedProps = { ...props, ref: (node) => { ...register...; originalRef?.(node) } }` — for both host elements and custom components. Every function component in the tree therefore receives a ref it cannot hold.
3. `vite.config.ts:85` — `mode === "development" && componentTagger()`. The tagger is active only on the dev server.
4. `playwright.truth.config.ts:73-91` — the truth web server is `npx vite --port <PORT> --strictPort`, i.e. **development mode, tagger active**.
5. `playwright.perf.config.ts:65` — the perf web server is `npx vite build && npx vite preview`, i.e. **production mode, tagger absent**. The perf gate passed (`g3-perf.exit: 0`) on the same head.
6. Warning stacks in `gate-g4-truth-shard2.log` climb the entire tree (`App` → `ErrorBoundary` → `next-themes` → `MotionConfig` → `BrowserRouter` → `RouteEntry` → `RuntimeAppProviders` → `QueryClientProvider` → …), including third-party components the repository does not own. A single app-owned root cause cannot explain warnings on `MotionConfig` or `_HelmetProvider`.
7. `pageerror` count 0 in shard 2/3 traces; drawer destination assertions passed (`dsx-card-destinations.spec.ts:205`). Only the console-cleanliness assertions failed (`:206` and `navigation-full-surface.spec.ts:102`).

### Classification (item 2 of the request)

- Not one app-owned root component.
- Not a Radix `Slot`/`asChild` contract break, not `cloneElement(ref)` — no app-owned `cloneElement` call sites exist under `src/`.
- Not a React duplicate/version mismatch — single `react@18.3.1` / `react-dom@18.3.1`, no nested copies.
- It **is** a wrapper-factory/instrumentation defect: one dev-tooling JSX wrapper, one owner, one mechanism.
- Residual app-owned ref defects, if any, are currently **masked** by the flood and cannot be asserted either way until the flood is removed. Step 2 below measures that instead of guessing.

## Remediation

### Step 1 — Harness environment correction (the actual fix)

Run truth-in-UI against a Vite server that does not load the tagger, keeping the dev-server ergonomics the suite depends on (unbundled modules, `page.route()` interception, Kit env vars).

- `vite.config.ts`: change the tagger predicate from "development mode" to "development mode **and not an automated run**" using an explicit, documented env flag (for example `AURA_DISABLE_COMPONENT_TAGGER`). No other plugin, alias, define or build behaviour changes.
- `playwright.truth.config.ts`: pass that flag in the existing `webServer.env`/command prefix, alongside the current loopback Supabase/Kit values.
- Apply the same flag to any other Playwright config whose web server runs `vite` in dev mode and asserts console cleanliness (audit: `playwright.config.ts`, `playwright.deeplink.config.ts`, `playwright.drawer-sequence.config.ts`, `playwright.route-stress.config.ts`, `playwright.settings.config.ts`, `playwright.builder.config.ts`, `playwright.uxaudit.config.ts`, `playwright.crossbrowser.config.ts`, `playwright.gpu.config.ts`, `playwright.visual.config.ts`) — the defect family, not one config.

Explicitly not done: no console filtering, no allowlist of warning text, no relaxed or removed console assertions, no retries, no skips, no snapshot updates, no dependency upgrade or removal of `lovable-tagger` (the preview experience keeps it).

### Step 2 — Measure the residual, then fix only what evidence names

With the tagger off, re-run `dsx-card-destinations.spec.ts` and `navigation-full-surface.spec.ts` on the same head and capture the remaining console output.

- If zero warnings remain: the defect is closed by Step 1; no source component changes are made.
- If any warning remains, it now carries an unambiguous `Check the render method of X` plus an app-owned frame. Each such recipient is converted to `React.forwardRef<HTMLElement-subtype, Props>` with the ref forwarded to the real DOM node, correct element/ref generics, and `displayName` set. Predictive sweep for the same family: every app-owned function component consumed by a `Slot`/`asChild` parent, a Radix trigger, a `Tooltip`/`Dropdown`/`Dialog` trigger, or any parent passing `ref` — fixed together, not one at a time.

### Step 3 — Tests

- New unit test asserting the tagger predicate is false when the flag is set and true for normal development (guards the harness contract).
- **Negative reproduction test**: a focused spec that boots the app with the tagger deliberately enabled and asserts the warning flood is observable, so the mechanism itself is regression-covered and can never be "fixed" by silencing console output.
- Existing console-cleanliness assertions stay byte-identical.
- Any `forwardRef` conversion from Step 2 gets a focused test asserting the ref reaches the DOM node.

### Step 4 — Governed learning for the AURA Super Agent

Add one **reviewed, versioned** lesson to the code-owned lesson registry (the Phase 1 contract added in `ce4fbb45`/`be5da9d0`), plus a matching eval case:

- Lesson: *ref transparency* — a component consumed by `Slot`/`asChild`, `cloneElement`, or any ref-bearing parent must be ref-transparent; and a warning flood observed only under a dev-mode tooling server is an environment finding, not an application defect, until a production-mode run reproduces it.
- Citations: exact files and lines above (`react-dom.development.js:20196`, `lovable-tagger/dist/index.js` jsxDEV, `vite.config.ts:85`, `playwright.truth.config.ts:73-91`, `playwright.perf.config.ts:65`) and the failing tests.
- Synthetic eval/regression case that fails on the *mechanism* (mistaking a dev-tooling ref injection for an app root cause), not on wording.
- Promotion gate: the lesson may not promote unless the truth suite, authorization/tenant suite, provenance suite, typecheck, lint and build all pass on the exact candidate SHA. Retrieval-only at runtime; no autonomous prompt/policy rewriting, no user-content ingestion, no training on unreviewed output.

### Step 5 — Qualification (new exact SHA)

Sequential, single wrapper, unique ports, hard per-gate timeout, no concurrency:

1. `npm run typecheck`, `npm run lint`
2. unit + architecture + schema suites, `verify:fast`
3. `npm run build`
4. negative warning reproduction spec
5. `npm run test:truth` — four sequential shards
6. `npm run test:perf`
7. isolated `dsx-card-destinations` filtered to the drawer-destination test

Record start/end HEAD and cleanliness; a per-gate exit file each; results are valid only for the exact candidate SHA. `0371589a` remains RED and is not requalified by this work.

## Risks

- Turning the tagger off for automated runs changes what the test server serves versus the Lovable preview. Mitigated by the perf gate already exercising the production bundle and by keeping the tagger on for normal development.
- The flood may be masking genuine app-owned ref defects; Step 2 exists precisely to surface them, and the plan does not promise "zero changes" to `src/`.
- Shard 3 and shard 4 were never completed; unknown failures may exist beyond the console assertions. Full sequential requalification is required, not a partial re-run.
- Fixing tagger interaction does not address the shard 2 runtime cost (257s sweep); if the sweep still runs long after the flood is gone, that is a separate finding, not part of this fix.

## Acceptance criteria

1. `navigation-full-surface.spec.ts` and `dsx-card-destinations.spec.ts` pass on the candidate SHA with their console assertions unchanged (`toEqual([])`).
2. Zero occurrences of "Function components cannot be given refs" in truth-suite logs, achieved without any filter, allowlist, suppression, retry or skip.
3. The negative reproduction test fails when the tagger is re-enabled, proving the assertion still has teeth.
4. Any `src/` change is a `forwardRef` conversion justified by a captured warning naming that component.
5. Typecheck, lint, unit/architecture/schema, build, truth (4 shards), perf and isolated DSX gates all green on one exact SHA.
6. The Super Agent lesson and eval case are registered, versioned, cited, and blocked from promotion until gate 5 passes.
7. `/tmp/aura-release-qual-0371589a-v2/` and its RED-NO-GO record remain untouched; the RED verdict for `0371589a` stands.

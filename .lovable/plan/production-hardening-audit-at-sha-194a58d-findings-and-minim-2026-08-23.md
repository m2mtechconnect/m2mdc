# Production-hardening audit at SHA 194a58d — findings and minimal patch plan

Read-only audit. No files were changed. Everything below is proposed work, not applied work.

---

## 1. Production perimeter allowlist reconciliation

### What exists now

- Allowlist: `docs/remediation/evidence/pr-0.1/route-allowlist.json` (schema_version 2, policy `default-deny`).
  - `production_functions`: `[]` (empty).
  - `production_routes`: `/`, `/login`, `/forgot-password`, `/sign-out`, `/pilot/*`.
  - `disabled_functions`: `green-dc-recommend`, `generate-ai-recommendations`.
- Inventory: `docs/remediation/evidence/pr-0.1/edge-function-inventory.json` — 170 entries: 167 `unknown-blocked`, 2 `disabled`, 1 `signed-webhook`. Zero `production-allowlisted`.
- Enforcer: `scripts/verify-production-perimeter.mjs`, run by `.github/workflows/production-perimeter.yml` on every push/PR.

### Two blocking facts confirmed by reading the source

1. **The promotion gate references a module that does not exist.** Rule 3 (`scripts/verify-production-perimeter.mjs`, "allowlisted functions must import _shared/authz") requires each promoted function to import `_shared/authz.ts`. `supabase/functions/_shared/` contains `adminAuthorization.ts`, `callerIdentity.ts`, `handler.ts`, `cors.ts`, `managedConnectorAuthz.ts` — but **no `authz.ts`**, and `rg "_shared/authz"` matches 0 function entrypoints. So today *any* promotion fails CI. The rule must be pointed at the real guard modules before a single function can be promoted.
2. **Route classification checks are effectively inert.** Rules 6 and 8 parse `<Route path=...>` only from `src/App.tsx`, which now declares 1 route. The real route tables are `src/PublicAppRoutes.tsx` (19) and `src/AuthenticatedShell.tsx` (77). The allowlist's route lists are therefore no longer enforced against the shipped router.

### Evidence basis for promotion candidates

46 distinct edge functions are actually invoked from `src/` (via `supabase.functions.invoke`). Promotion should be driven by that call-graph plus the guard each handler uses, not by intent. Proposed dispositions:

- **Promote (tier 1, called from an approved-user surface and guarded in-code):** the invoked functions whose handlers set an explicit `authLevel` and go through `_shared/callerIdentity.ts` or `_shared/adminAuthorization.ts` and `_shared/cors.ts`. Each promotion requires the six-point evidence record already written into the allowlist `notes`, with the `_shared/authz.ts` clause rewritten to name the real modules.
- **Do not promote:** anything not in the 46-item invoked set (dead server surface — leave `unknown-blocked`); `green-dc-recommend` and `generate-ai-recommendations` (already `disabled`, and rule 9 forbids dual listing); `public-intake` (anonymous intake, explicitly outside the perimeter per `supabase/config.toml`); `dsx-ingest` (`verify_jwt = false`, must stay classified `signed-webhook`).
- **Explicitly undecided:** functions invoked from routes still listed in `production_blocked_routes` — promoting the function without promoting the route creates a false-positive surface.

### Minimal patch plan (no weakening of verification)

1. `scripts/verify-production-perimeter.mjs` — replace the single `_shared/authz` string check with a check that the entrypoint imports at least one of `_shared/callerIdentity.ts` / `_shared/adminAuthorization.ts` **and** `_shared/cors.ts`, and that it passes an explicit `authLevel`. Strictly more checks than today, not fewer.
2. Same file — extend the route scan to read `src/PublicAppRoutes.tsx` and `src/AuthenticatedShell.tsx` in addition to `src/App.tsx`, so rules 6 and 8 apply to the shipped router again. Expect an initial failure list; classify each route in the allowlist rather than relaxing the rule.
3. `docs/remediation/evidence/pr-0.1/edge-function-inventory.json` — flip only the tier-1 set to `production-allowlisted`, each with an evidence note.
4. `route-allowlist.json` — add the same names to `production_functions`, move the corresponding routes from `production_blocked_routes` to `production_routes`, bump `checkpoint`, and record the reconciliation in `notes`.
5. New unit test `scripts/__tests__/productionPerimeter.test.ts`: asserts default-deny still holds (a fabricated function with no guard import fails), and that allowlist and inventory stay in sync.

---

## 2. Mobile visual defects

### 2a. Builder — right-edge clipping of the secondary "Switch" control

Reproduction is step one: I have not captured the 375px Builder frame in this audit, so the exact clipped node is not yet confirmed. The strongest candidates from source:

- `src/components/builder/steps/Step1Summary.tsx:355-364` — an actions row `<div className="flex gap-3">` with two `flex-1` buttons ("Edit Configuration", "Switch Template"), each with an icon plus a non-wrapping label. At 375px the second button's label overflows its track; there is no `flex-wrap`, no `min-w-0`, and no truncation.
- `src/components/builder/BuilderModeToggle.tsx:43` — the `sm:` two-option toggle uses `w-full overflow-hidden`, which clips rather than reflows if it renders in a constrained header.

Proposed patch: change the actions row to `flex flex-col gap-3 sm:flex-row`, add `min-w-0` to each button and `truncate` to the label span; keep the icon `shrink-0`. Presentation-only, no logic touched.

### 2b. Dashboard — Action Center density and wrapping

`src/workspace/dashboard/ActionCenter.tsx:63-125`. Each `ActionRow` puts, on one line: an accent bar, a 9x9 tile (hidden below `sm`), a three-line text stack (title, impact, `Constraint · subsystem · evidence`), a primary `Button` (`max-sm:h-11`) and a 44px overflow trigger. At 375px the text column is roughly 180px wide, so all three lines `line-clamp-1` to near-nothing while the row still holds `min-h-[72px]`.

Proposed patch (presentation only):
- Below `sm`, drop the primary action button out of the row and surface it as the first item of the existing dropdown, leaving only the open-detail affordance plus the overflow trigger inline.
- Collapse the third metadata line into the second below `sm` (`hidden sm:block` on the mono line) so the visible content is title + impact.
- Give the text column `min-w-0 flex-1` (already present) plus `pr-2`, and reduce row padding to `pl-3 pr-2` below `sm`.
- Keep `useVisibleCount()` behaviour unchanged.

Verification for both: a Playwright capture at 375x812 asserting `document.scrollingElement.scrollWidth <= clientWidth` and that no control's bounding box exceeds the viewport, added to the existing truth-in-UI suite.

---

## 3. Image delivery / chunk / render-blocking wins (low risk, no threshold or truth changes)

Measured facts:

- `public/landing/hero-datacenter.mp4` — **33.5 MB**. By far the largest single deliverable.
- `src/assets/hero-datacenter-executives.png` — 668 KB; `public/landing/screenshots/blueprint-desktop.png` 364 KB; `public/assets/landing/twin-hero.png` 310 KB; `simulation-desktop.png` 297 KB; `dc-hero-visual.png` 238 KB; `hero-datacenter-bg.jpg` 238 KB.
- `index.html` already defers fonts (`media="print"` swap, `display=optional`) and gates Clarity behind first interaction — those are done.
- `vite.config.ts:131-149` sets `manualChunks` for `vendor-react` only, with `chunkSizeWarningLimit: 1000`.

Ranked proposals:

1. Serve the hero video with `preload="none"` plus a poster image, and only autoplay once it is in view and `prefers-reduced-motion` is not set. No re-encode needed to get most of the win; an optional offline re-encode to a ~3-5 MB 1080p H.264/WebM pair is a separate, non-blocking task.
2. Convert the six PNG/JPG assets above to WebP with `<picture>` fallbacks, and add `loading="lazy"` + explicit `width`/`height` to every below-the-fold landing image to remove layout shift.
3. Add `fetchpriority="high"` to the single LCP image and `decoding="async"` elsewhere.
4. Extend `manualChunks` with explicit `vendor-3d` (three, @react-three/*) and `vendor-charts` (recharts) groups so authenticated dashboards do not pull the 3D graph.

None of these touch release thresholds, provenance semantics, or data.

---

## 4. Keyboard, screen-reader, 400% reflow, reduced motion

Current state confirmed:

- Reduced motion is honoured in exactly four places: `src/index.css:761`, `src/workspace/CommandCentre.tsx:156`, `src/components/twin-visualization/DataCenter3DScene.tsx:671`, `src/components/landing/TwinHero.tsx:45`. There is no shared hook.
- No skip link exists anywhere in `src/` (matches `docs/audit/full-ux/accessibility-results.md`: "Skip link not detected").
- Existing suites in `tests/truth-in-ui/` cover axe, focus rings, and CoPilot focus trapping; there is no reflow, reduced-motion, or keyboard-traversal spec.
- `docs/audit/deep-page-wiring/accessibility-functional-findings.md` records one unnamed button on `/settings/ai` and an unconfirmed Escape-to-close failure on the nav drawer.

Proposed changes:

1. **Skip link** — add a visually-hidden-until-focused "Skip to main content" anchor at the top of `src/AuthenticatedShell.tsx` and `src/PublicAppRoutes.tsx`, targeting the existing single `main` landmark.
2. **Reduced motion** — add `src/hooks/usePrefersReducedMotion.ts` and route the four existing call sites through it; extend the `@media (prefers-reduced-motion: reduce)` block in `src/index.css` to also neutralise the staggered entrance animations.
3. **Screen-reader semantics** — give the `/settings/ai` icon-only button an `aria-label`; audit the Action Center rows for `aria-live` on status changes; confirm the nav drawer closes on Escape (Radix should already do this — verify before changing anything).
4. **Reflow** — no code change assumed yet; add the test first (below) and fix only what it reports.
5. **Tests** (new specs under `tests/truth-in-ui/`):
   - `keyboard-traversal.spec.ts` — Tab through each production route, assert every focused element has a visible focus indicator and that focus never leaves the document or enters a trap.
   - `reflow-400.spec.ts` — 1280x1024 at `deviceScaleFactor` equivalent to 400% (320x256 CSS px), assert no horizontal scroll and no clipped controls.
   - `reduced-motion.spec.ts` — with `reducedMotion: 'reduce'`, assert no element reports a running animation after settle.
   - Extend `tests/truth-in-ui/_setup/a11y-rules.ts` only if a new rule proves non-noisy; do not re-enable the documented Radix-noisy rules.

---

## Explicitly out of scope for this plan

No publish, no deploy, no baseline updates, no route/auth/RLS/migration changes, no production data access. Section 1 changes evidence JSON and the enforcer script only; sections 2-4 are presentation, asset, and test changes.

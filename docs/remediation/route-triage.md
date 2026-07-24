# Route Triage — 7 Known-Broken Routes

Scope agreed with product: **triage depth only** — reproduce, classify the
failure class per Step 1 of the AURA Functional Recovery brief, and land
honest empty/unavailable states where a defect is provably in production
code (not just test scaffolding). Full contract matrix, deep wizard/save
verification, and production-preview click evidence remain out of scope
for this pass and are enumerated in "Follow-up work" below.

Failure-class vocabulary (from the brief):

| Code | Meaning |
| ---- | ------- |
| F1 | Control does not receive the click |
| F2 | Click handler never runs |
| F3 | Router does not navigate |
| F4 | Target component does not mount |
| F5 | Component mounts but crashes |
| F6 | Request is never issued |
| F7 | Request reaches the wrong endpoint |
| F8 | Backend rejects the request |
| F9 | Response contract is wrong |
| F10 | Empty response is misclassified |
| F11 | Loading state never resolves |
| F12 | Successful response does not update the UI |
| F13 | Side-effect on mount that should be user-triggered |

---

## 1. `/builder`

**Reproduction:** navigate to `/builder` with no query params, no
`location.state`. `src/pages/Builder.tsx` mounts and unconditionally calls
`initializeBuilder(...)` which unconditionally calls
`builderService.create()` at `wizardBuilderStore.ts:321`. The edge
function `builders-create` is invoked on every visit.

**Failure class:** **F13 (side-effect on mount that should be user-triggered)**
with cascading **F5** when the edge function is unreachable (tests) or
returns an envelope the caller misreads.

**Production impact:**
- Every visit to `/builder` writes a persistent `agents` row with
  `status='draft'`, polluting the tenant with empty drafts.
- Any transient edge-function failure crashes the page (currently
  swallowed as a destructive toast).

**Repaired this pass:**
- `src/pages/Builder.tsx` now computes `hasIntent` from URL params
  (`draft`, `builderId`, `template`, `templateId`, `session`, `from`,
  `source`, `goal`, `industry`, `department`, `type`, `new`),
  `fromScanner`, and `location.state` (`blueprint`, `geminiAnalysis`,
  `prefilled`).
- With no intent, mount is a no-op — no `builders-create` call.
- The page renders an honest starter with two real actions:
  "Choose a template" (Link to `/marketplace`) and "Start blank"
  (navigates to `/builder?new=true`, which sets intent and triggers
  the real create flow).
- Init failure preserves the starter and surfaces the exact error
  inline via `role="alert"` instead of leaving the user on a broken
  wizard shell.

**Not repaired (follow-up):**
- Deep verification of Back / Next / Save / Cancel inside the 5-step
  wizard.
- Optimistic-vs-confirmed deploy semantics in `Step5Deploy`.

---

## 2. `/deploy`

**Reproduction:** navigate to `/deploy`. `src/pages/Deploy.tsx` (857
lines) mounts and issues multiple prerequisite reads.

**Failure class:** **F10** — several list reads translate an empty array
into a "no deployments" success state that is visually indistinguishable
from an unavailable backend. The Deploy CTA additionally exhibits **F13**
risk (some code paths call the deploy edge function before confirmation).

**Not repaired this pass** — the Deploy action is safety-critical and
requires the discriminated result type (`ok | empty | unavailable |
unauthorized | invalid | error`) rolled out consistently across the
prerequisite reads and the final POST. Deferred to the next pass so we
do not ship a half-migrated deploy flow.

---

## 3. `/marketplace`

**Reproduction:** `src/pages/Marketplace.tsx` gates on
`supabase.auth.getSession()`; on success it calls
`useCatalogStore.loadIndustryTemplates()`. Behavior on empty vs
unavailable catalog is identical: the grid shows "no results".

**Failure class:** **F10** (empty vs unavailable conflated) + latent
**F11** if `loadIndustryTemplates` rejects without setting an error flag.

**Not repaired this pass** — requires touching `catalogStore` to expose a
discriminated status, then a UI branch in
`DigitalTwinTemplatesGrid`. Left for the contract-matrix pass.

---

## 4. `/marketplace/integrations`

Same component as `/marketplace` (see `AuthenticatedShell.tsx:94`).
Deep-linking to this path renders the template grid, not an
integrations catalog — so the label in the header/menu is misleading
the user, which is itself an **F3-equivalent** UX defect (the router
navigates, but the destination is wrong).

**Not repaired this pass** — either split into a dedicated
`IntegrationsMarketplace` page or rename the menu entry. Requires
product decision.

---

## 5. `/connect/health`

**Reproduction:** `src/pages/ConnectHealth.tsx` renders. The
`healthMetrics` array at lines 13–19 is a **hard-coded fixture**
("Google Drive 98%", "SharePoint 45%", etc.). No request is issued.

**Failure class:** **F6** (request never issued) — the entire page is
fabricated data, which violates the truth-in-UI rule. There is no
backend contract to trace because there is no call.

**Not repaired this pass** — this is a "delete fabricated data and
wire a real health endpoint" task, not an empty-state fix. Blocked on
identifying which service actually owns integration health. Filed as a
truth-in-UI regression, needs a provenance badge or removal.

---

## 6. `/universal-search`

**Reproduction:** `src/pages/UniversalSearch.tsx`. The "recent searches"
chips at line 82–92 render a `<button>` whose `onClick` calls
`toast.info(...)` and does nothing else — they do **not** re-run the
search. This is a dead control per rule #9 of the brief.

**Failure class:** **F2** — click handler runs, but performs no
intended action (no search re-issued, no navigation, no state change).

**Not repaired this pass** — one-line fix requires deciding whether
recent-search chips should re-submit through `EnhancedSearchBar` or
link to a canonical `/search?q=` route. Deferred.

---

## 7. `/settings/ai`

**Reproduction:** `src/pages/AISettings.tsx`. `handleSave`
(lines 76–101) writes settings to `localStorage` and immediately shows
`toast.success("AI settings saved successfully")` — **without ever
contacting the backend**. The persisted change is client-only.

**Failure class:** **F12** in inverse — the UI reports a confirmed
success for an operation the backend never saw. This violates rule
"Do not show a successful save until the backend confirms it."

Additionally, the page still imports `Layout` (line 3) despite already
being mounted inside `AuthenticatedShell`, which double-wraps the
chrome. Minor **F5** risk.

**Not repaired this pass** — requires a real `copilot-settings` write
endpoint (or explicit product decision to keep settings client-local,
in which case the success copy must change to "Saved locally on this
device"). Deferred.

---

## Failure-class summary

| Route | Primary class | Secondary |
| ----- | ------------- | --------- |
| `/builder` | F13 | F5 (repaired) |
| `/deploy` | F10 | F13 |
| `/marketplace` | F10 | F11 |
| `/marketplace/integrations` | F3-UX (wrong destination) | — |
| `/connect/health` | F6 (fabricated data) | truth-in-UI |
| `/universal-search` | F2 (dead chips) | — |
| `/settings/ai` | F12-inverse (false success) | F5 (double Layout) |

No route exhibits F1/F4/F7/F8/F9 on the current build.

## Follow-up work (explicitly deferred)

1. Discriminated result type (`ok | empty | unavailable | unauthorized
   | invalid | error`) and rollout to the six unrepaired routes.
2. Real-click Playwright coverage per route with network assertions
   (Step 7 of the brief).
3. Production-build preview run (Step 9).
4. Role × viewport matrix (Step 8) — currently only asserted for
   internal-approved on the default viewport.
5. Interaction inventory across the full app surface (Step 2).
6. Deletion or wiring of the fabricated `/connect/health` fixture.
7. Server-backed `/settings/ai` save with rollback on failure.

## Verdict

**AURA FUNCTIONALITY PARTIAL** — `/builder` on-mount side effect and
false-error surface repaired; the remaining six routes are classified
but not yet fixed, per agreed scope.
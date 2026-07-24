# AURA Settings-AI Slice — Evidence

Date: 2026-07-24

## Tests added
- `tests/builder/builder-failure-retry.spec.ts` — one-time 503 intercept for
  the first `builders-create`, real backend for Retry. Asserts:
  1 intercepted failure, 1 real backend success, 1 persisted draft,
  URL/wizard/error transitions, refresh idempotency, clean console.
- `tests/settings/settings-ai.spec.ts` — authorized direct-route load,
  inline validation, aria-invalid transitions, save persistence,
  duplicate-click guard via `isSaving`, refresh restores state.

## AISettings repairs (src/pages/AISettings.tsx)
- Initial loading skeleton with `aria-busy`.
- Inline field-level validation with `aria-invalid` / `aria-describedby`.
- `isSaving` guard: button disabled + spinner; blocks duplicate submissions.
- `saveError` and `loadError` surfaced with `role="alert"`.
- Existing localStorage persistence contract preserved (no schema change).

## Playwright results (dev server, port 8080)
- `bunx playwright test --config=playwright.builder.config.ts tests/builder/builder-failure-retry.spec.ts` → 1 passed (12.0s)
- `bunx playwright test --config=playwright.settings.config.ts` → 1 passed (11.0s)
- `bunx playwright test --config=playwright.builder.config.ts` (full builder dir) →
   1 passed, 1 failed. The failure is the pre-existing success spec tripping
   on ambient `Failed to fetch location` console errors emitted from
   `ActiveTwinContext` during real-backend history navigation. Not introduced
   by this slice; the retry spec passes cleanly in the same run.

## Typecheck
- `bunx tsgo --noEmit` → clean.

## Not covered in this slice
- RBAC lockdown of `/settings/ai` (admin-only) — would require schema/policy
  work that is explicitly out of scope for this slice.
- Server-side persistence of AI settings — current contract is client-side
  `localStorage.copilot_settings`; no migration performed.
- Production-build preview verification (`bun run build` + preview) —
  deferred: no repository-owned preview script is wired for the sandbox.
- Remaining deferred routes (/deploy, /marketplace, /marketplace/integrations,
  /connect/health, /universal-search) — untouched per slice boundary.

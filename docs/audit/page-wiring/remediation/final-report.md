# AURA Page-Wiring Remediation - Evidence and Acceptance

Published build under test: **bmswgpn7a** (bundle `index-BzLbfBq-.js`, manifest v7, stamped 2026-08-16T23:55:03Z) at https://auradc.m2mtechconnect.com.
Two later fixes below are verified on the local build and require a re-publish.

## Findings resolved by severity
- P1 - Simulation workflow unreachable/unrunnable: closed. `?step=` is authoritative (`src/workspace/useWorkflowStep.ts`), gated steps rewrite to `simulate` with a stated reason, run gating explained accessibly (`aria-describedby="simulation-run-blocked-reason"`).
- P1 - Deep link to `?step=simulate` rewritten to `?step=inspect` (found during acceptance): closed via `urlSyncPending` guard; the rewrite notice now survives the follow-up render.
- P1 - No export path from Compare/Review: closed. `src/workspace/runExport.ts` + `RunExportControls` emit CSV/JSON with per-metric provenance and the Stage 5 truth block.
- P2 - Auth fetch loops / empty `user_id` queries: closed (`profileQuery.ts`, `UserMenu.tsx`).
- P2 - Signed-in users stuck on `/login`, `/onboarding`; dead `/deploy`: closed (`AuthenticatedEntryRedirect.tsx`).
- P2 - `/connect/monitor` perpetual spinner: closed; settles to a labelled not-configured state.

## Remaining limitations / blockers
- `/omniverse-scene` authenticated load shows one aborted `GET /auth/v1/user` (`TypeError: Failed to fetch`); no user-visible failure, still open.
- Live landing asset `/landing/hero-datacenter.mp4` 404s (pre-existing, falls back to poster).
- 228 pre-existing failures in the legacy suite, outside remediation scope.
- No penetration or authorization fuzz testing was performed; verification was route-level with one engineer session.

## Verification evidence
- Routes tested: 65 anonymous + 65 authenticated (engineer, `lucas@m2mtechconnect.com`).
- Simulation run: **SIM-2026-08-17-001** executed end to end; persisted across refresh; Compare and Review both bind to it; browser back/forward maps to `?step=compare` / `?step=decide`; duplicate submit rejected; zero console errors, zero failed application requests.
- Export: CSV/JSON payload asserted to carry run id, baseline+scenario KPIs, `liveFacilityDataUsed: No`.
- Tests: 80 remediation-scoped tests passing across `src/workspace`, `src/routing`, `src/lib/auth`, `src/validation`; typecheck clean.

## Final verdict
**AURA_PAGE_WIRING_REMEDIATION_VERIFIED_PENDING_REPUBLISH**

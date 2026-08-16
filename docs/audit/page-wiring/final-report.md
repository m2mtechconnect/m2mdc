# AURA page-wiring audit - final report

Host swept: `https://auradc.m2mtechconnect.com` (the `m2mdc.lovable.app` URL 302s
here). Candidate: bmsv7jcuh, manifest v6. Renderer: SwiftShader (no visual or
performance verdict issued). No production behaviour, route, permission or 3D
asset was modified during this audit.

## Counts

| Metric | Count |
| --- | --- |
| Declared routes (public 13 + internal 47 + alias 25 + pilot 3) | 88 route declarations, 65 distinct paths swept at runtime |
| Reachable at runtime (correct component mounted) | 63 of 65 swept |
| WIRED_VERIFIED | 9 |
| WIRED_WITH_LIMITATIONS | 44 |
| PLACEHOLDER_OR_DEMO | 2 (`/connect/monitor`, `/digital-twins-demo/funding-intake`) |
| BLOCKED_UNVERIFIED | 8 (all mutations, run/compare/export, non-internal roles) |
| DEAD_ROUTE | 3 (`/login` and `/onboarding` when signed in, `/deploy`) |
| DUPLICATE_ROUTE | 1 (`/integrations` link from Blueprint) |
| UNREACHABLE by navigation | 11 declared routes with no UI entry point |
| AUTHORIZATION_DEFECT | 0 |
| DATA_INTEGRITY_DEFECT | 2 |

| Severity | Count |
| --- | --- |
| P0 | 0 |
| P1 | 1 (simulation run cannot be executed or verified end to end) |
| P2 | 6 |
| P3 | 7 |

## Verdicts

- Core workflow: PARTIAL. Sign-in, facility selection, inspection, configuration
  surfaces and evidence provenance are wired; simulation execution, comparison
  and export could not be completed (disabled control, no run id).
- Admin workflow: PARTIAL. All admin routes are protected and render their
  intended components with real records; no write was exercised, and
  `/admin/reference-facility-validation` fires a malformed profile query.
- Published host: PASS for routing and authorization. Every internal route
  redirects anonymous visitors to the landing page, all aliases resolve, deep
  links and hard refresh behave, and there is no SPA fallback masking.

## Proposed repair sequence (not implemented)

1. P0 security and data integrity: none open.
2. P1 core workflow: make `/simulation` "Run simulation" either executable or
   explain its disabled reason inline, and produce a stable run id that flows
   into Compare, Review and Export.
3. P2 incomplete pages and integrations: encode the simulation step in the URL;
   fix the empty-`user_id` profiles query; fix the aborted `/auth/v1/user` loop
   on `/simulation/preview`; settle or remove the `/connect/monitor` spinner and
   label its counters honestly; route `/login` and `/onboarding` to `/dashboard`
   for signed-in users; report reference-facility mode status explicitly.
4. P3 navigation and usability: retire or redirect `/deploy`; point Blueprint's
   integrations link at `/manage/integrations`; give the 11 orphaned routes a
   navigation entry or retire them; add disabled-reason text to
   "Ask AURA Assistant".
5. Automated regression coverage: extend the truth-in-UI Playwright suite with
   the anonymous-redirect matrix, the alias matrix, the console/network
   zero-error assertion and simulation step deep-link persistence.

## Final verdict

AURA_PAGE_WIRING_AUDIT_PARTIAL

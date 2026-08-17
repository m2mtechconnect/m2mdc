# Final report - AURA full UX audit

- Published build audited: `assets/index-CCUS0faN.js` at https://auradc.m2mtechconnect.com (reachability only); interaction evidence gathered on the local build of the same revision.
- Routes: 102 declarations + 24 aliases inventoried; 85 concrete routes navigated at 1440x900; 17 at 1920x1080, 1024x768 and 390x844. Aliases not re-traversed at runtime.
- Roles tested: Administrator, Anonymous. Engineer and Pilot: BLOCKED_UNVERIFIED.
- Dataset modes: legacy-synthetic default (85 routes), nvidia-dsx-reference canary (17 routes).
- Viewports: 1920x1080, 1440x900, 1024x768, 390x844. Missing: 1280x800, 768x1024, zoom 80/125/200%.
- Journeys A-F PARTIAL (reachability only); Journey G BLOCKED_UNVERIFIED.
- Page scores: `page-scorecard.csv`.
- Severity totals from executed checks: P0 = 0; P1 = 3 (reference labelling, reference trend charts, tablet/mobile overflow); P2 = 6; P3 = 3.
- Navigation findings: `navigation-audit.md`. DSX relevance and duplicates: `dsx-relevance-matrix.md`.
- 3D findings: canvas mounts everywhere, overflow below 1280px; manipulation and obstruction checks unexecuted.
- Data honesty findings: `data-honesty-audit.md`. Responsive: `responsive-results.md`. Accessibility: `accessibility-results.md`. Performance: median 2.68 s time-to-content, no GPU claim.
- Top 10 priorities: UX-001, UX-004, UX-002, UX-003, UX-005, UX-006, UX-007, UX-008, UX-011, UX-009.
- Recommended navigation changes: single canonical 3D route, single user-approval surface, single agent-chat route, retire `/deploy`, rename `omniverse-scene`.
- Blocked from verification: published-host authenticated interaction, screenshots, keyboard and screen-reader testing, 3D manipulation, exports, mutations, Search/Assistant grounding, Engineer/Pilot roles, 1280x800 and 768x1024, zoom levels, rollback drill.
- Evidence paths: `docs/audit/full-ux/evidence/sweep.json`, `evidence/summary.json`, `evidence/sweep.log`, `route-inventory.json`, `page-scorecard.csv`, `token-violations.json`.

Final verdict: AURA_FULL_UX_AUDIT_PARTIAL

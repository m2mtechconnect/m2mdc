# Phase 5 - page findings (aggregate, evidence: evidence/sweep.json)

85 desktop routes navigated at 1440x900 as Administrator.

- 81/85 routes render sub-11px text (8 elements per page from shared chrome, plus page-local cases) - P2 accessibility/readability, systemic.
- 82/85 routes use hardcoded `text-white` / `bg-black`-class utilities that bypass the theme tokens - P3 visual-system debt, systemic.
- 80/85 routes contain interactive controls smaller than 24x24 CSS px - P2 WCAG 2.2 target-size risk.
- 76/85 routes skip heading levels at least once - P2 screen-reader structure.
- 2 routes expose a control with no accessible name; 1 axe violation type in total (`aria-progressbar-name`, 1 node) - P3.
- 9 routes present disabled actions with no `title`/`aria-describedby` reason - P2 error prevention.
- 1 route still shows a spinner after network idle (`/onboarding`) - P2, needs manual confirmation.
- 0 console errors across all 85 routes. All routes log at least one failed request (third-party `clarity.ms` telemetry blocked in the sandbox) - not a product defect.
- 75/85 routes render em dashes in body text, which violates the project typography rule - P3.
- No table exceeded 50 rendered rows in this run; the previously reported 324-row admin table was not reproduced with this data set.
- Per-route scores: `page-scorecard.csv`.

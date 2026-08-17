# Functional accessibility findings

Verified at 1440x900 only.

- Icon-only controls: 0 unnamed buttons on 15 of 16 audited pages; `/settings/ai` has 1 button with no accessible name (P3, ACCESSIBILITY_BLOCKER for screen-reader users).
- Escape did not close the opened navigation drawer in the harness (`drawerClosedOnEscape: false`). Needs manual confirmation before it is treated as a defect (P3, BLOCKED_UNVERIFIED).
- `/admin/signups-dashboard` renders 324 table rows and 338 buttons with no pagination, which is an interaction and performance risk (P3).
- Not executed: 1920x1080, 1366x768, 1024x768 and mobile breakpoints; keyboard traversal; focus-visibility; modal focus trapping; label/error association. These remain BLOCKED_UNVERIFIED.

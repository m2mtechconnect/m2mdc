# Phase 14 - accessibility (WCAG 2.2 AA)

Automated (axe-core, wcag2a/wcag2aa/wcag22aa, 85 routes):
- 1 violation type total: `aria-progressbar-name` (1 node). Automated coverage is therefore clean but insufficient on its own.

Structural checks beyond axe:
- Sub-11px text on 81/85 routes (readability, not an axe failure).
- Controls under 24x24 px on 80/85 routes - WCAG 2.2 AA target-size risk.
- Heading-level skips on 76/85 routes.
- 2 routes with an unnamed control; 9 routes with unexplained disabled controls.
- Exactly one `main` landmark per route.
- Skip link not detected on the sampled routes.

Not executed: keyboard-only traversal, focus visibility, focus restoration on drawer/dialog close, escape-to-close, status announcements, table header semantics, chart text alternatives, contrast measurement, reflow at 400%, reduced motion, screen-reader description of 3D state - BLOCKED_UNVERIFIED. Manual assistive-technology testing is still required.

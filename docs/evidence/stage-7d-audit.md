
## Post-implementation independent audit (a11y + regression)

Method: axe-core 4.10.2 (wcag2a/2aa/21a/21aa) on `/dashboard` at 1536x864 and
390x844, in default state and with the Rack Quick View open, plus the existing
`playwright.truth.config.ts` suites.

Defects found and fixed:

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| A-01 | critical (40 nodes) | Rack `<g role="button">` carried `aria-selected`, which is not an allowed attribute for that role. | Replaced with `aria-haspopup="dialog"` + `aria-expanded`, which truthfully describes the Quick View. |
| A-02 | critical | Header Help control had no accessible name at 390px (label is `hidden sm:inline`). | Added `aria-label="Help and guided tours"`; icon marked `aria-hidden`. |
| A-03 | serious | Active nav label `#3c83f6` on `#ecf2fe` = 3.24:1; active facility layer chip `#0176d5` on `#e1effa` = 3.93:1. | Added `--info-strong` (#0B5CAB) token and used it for text on info tints. |

Result: 0 axe violations across all four dashboard states; 15/15 truth-in-UI
a11y and sign-out regression tests pass.

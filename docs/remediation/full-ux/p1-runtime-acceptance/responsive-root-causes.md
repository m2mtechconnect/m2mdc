# Responsive overflow - root causes

Root cause: the shared authenticated content region (`<main>` in `src/components/Layout.tsx`) is a
flex child without `min-width: 0`. Flex children default to `min-width: auto`, so any wide grid,
table, tab row, KPI row or long identifier inside a page forced the main column wider than the
viewport, which propagated to the document. This is a single shared-layout defect, not 15 page
defects, which is why the correction is one class on the shared region rather than page patches.

Correction: `min-w-0` on both the full-bleed and the constrained `<main>` variants. No
`overflow-x: hidden` was added at the document level and no content was shrunk to fit.

Remaining: intentionally wide tables still scroll inside their own containers. Those local
scrollers are keyboard-reachable and are recorded as intentional, not as document overflow.

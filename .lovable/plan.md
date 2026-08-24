# /analytics horizontal overflow at 375px - diagnosis

## Root cause (measured, not inferred)

At a 375px viewport `document.documentElement.scrollWidth` measured 443px in this sandbox
(the reported 425px is the same defect with slightly different text metrics). Hiding all
`.recharts-tooltip-wrapper` nodes drops `scrollWidth` from 443 to exactly 375, isolating the
cause to a single element class.

Offending element:

```text
div.recharts-tooltip-wrapper
  style="visibility: hidden; pointer-events: none; position: absolute;
         top: 0; left: 0; transform: translate(96.125px, 10px);"
  width 309px, right edge 443px
  parent: div.recharts-wrapper (overflow-x: visible)
```

Why it expands the document: Recharts always mounts the tooltip node, even when idle. It is
only `visibility: hidden` (not `display: none`), so it still participates in layout and
scroll-extent calculation. It is absolutely positioned inside `.recharts-wrapper`, which is
`position: relative` but `overflow: visible`, so its box escapes the card. Its intrinsic
width is set by the longest single-line category label, and no ancestor between it and
`<main>` clips overflow - every ancestor in the chain (`p-6 pt-0`, the card, the
`grid grid-cols-1 lg:grid-cols-2 gap-6`, the tab panel, `w-full min-w-0 max-w-[1600px]`,
`main`) is `overflow-x: visible`.

The widest tooltip belongs to the GPU/accelerator utilization bar chart on the default
Overview tab, whose longest label is `Accelerated Compute Pod A - LLM Training`
(`gpuUtilData`, `src/pages/IntelligenceDashboard.tsx:388`, chart at lines 866-891).
The other two Overview tooltips measure 51px and 62px and never cross the viewport edge.

Dashboard and Builder pass because neither renders a Recharts category chart with a label
this long at mobile width.

## Recommended minimal fix

Smallest, lowest-risk source change - clip the chart wrapper so the idle tooltip box cannot
extend the document. Recharts keeps live tooltips inside the chart view box by default
(`allowEscapeViewBox` is false), so visible tooltips are unaffected.

Option 1 (single line, global, preferred):

`src/index.css`

```css
/* Idle Recharts tooltip nodes stay laid out and can widen the document. */
.recharts-wrapper { overflow: clip; }
```

Option 2 (scoped to the page, no global CSS):

`src/pages/IntelligenceDashboard.tsx` - add `overflow-x-clip` to the `CardContent`
that wraps the `ResponsiveContainer` at line 868 (and optionally the two at 790 / 833).

Non-fixes to avoid: shortening `gpuUtilData` labels (changes customer-visible copy and only
moves the threshold), or `overflow-hidden` on an ancestor card (introduces clipped
scroll contexts around interactive chart content).

## Verification after the fix (when implemented)

Re-run the deterministic 375px check on `/analytics`; `documentElement.scrollWidth` and
`body.scrollWidth` should both equal 375. Confirm chart tooltips still appear on hover.

No code was changed for this diagnosis.

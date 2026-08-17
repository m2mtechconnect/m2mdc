# Chart semantic classification

Classifications: POINT_IN_TIME, TRUE_TIME_SERIES, SIMULATED_SERIES, DERIVED_SERIES, UNAVAILABLE
(`src/data/dataset/chartSemantics.ts`).

Rules enforced in code:
- A trend renderer (line, area, sparkline, trend arrow, animated history) requires at least two
  timestamped observations, a unit, a source and a defined time range.
- Simulated and derived series additionally require a run or scenario identity and are labelled
  AURA-simulated / AURA-derived, not measured.
- POINT_IN_TIME renders as a snapshot value card carrying value, unit and the statement
  "Historical trend unavailable".
- UNAVAILABLE renders a terminal unavailable state and never substitutes a point value or a
  synthetic history.

`TrendStrip` accepts a `classification` prop and switches to the snapshot presentation for
POINT_IN_TIME and UNAVAILABLE. Its pre-existing two-observation threshold remains in force for the
time-series path. Call sites that still pass the default TRUE_TIME_SERIES value are recorded in the
remaining backlog for per-call-site classification.

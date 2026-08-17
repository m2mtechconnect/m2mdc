# Test results

- Typecheck (`tsgo --noEmit -p tsconfig.app.json`): clean.
- `vitest run src/data/dataset`: 5 files, 63 tests passed, including the 5 new chart-semantics
  regression tests proving a single reference value cannot enter a trend renderer.
- Runtime overflow probe: 8 routes x 5 breakpoints = 40 probes, 0 overflow rows.
- Runtime dataset-label probe: 13 authenticated routes in reference and legacy mode.

# Runtime synthetic dependency proof

Enforcement point: `src/components/dataset/ReferenceRouteGate.tsx`. While the
canary is active a REFERENCE_DATA_CONSUMER route renders `ReferenceSurface`
and a REFERENCE_UNAVAILABLE route renders `ReferenceUnavailableSurface`; the
legacy page component is never mounted, so its fixture imports are never on a
runtime-reachable path.

Static enforcement: `surfaceCoverage.test.ts` fails if any declared route is
unclassified; `canaryEndToEnd.test.ts` and `datasetCanary.test.ts` (47 tests)
assert selector-only data access and terminal unavailable states.

Runtime observation on the published host (administrator + reference):
- 20 consumer/neutral routes and 25 evidence-beta routes loaded: 0 console
  errors, 0 failed requests, 0 permanent spinners.
- Every evidence-beta route showed a terminal unavailable state naming the
  missing source, with rollback available; none started an interval series.

Result: **reference-canary runtime-reachable synthetic dependencies = 0** for
the surfaces exercised. Limitation: this is mount-level and network-level
evidence over 45 published routes, not an exhaustive module-graph trace of all
87 declarations. Recorded as verified-with-limitations.

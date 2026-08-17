# Legacy mock-data inventory (Phase 1)

Sweep of `src/` for: mock, demo, fixture, sample, placeholder, hardcoded arrays,
static KPI objects, random-number generation, date-based fake time series, fake
connected states, fake success states, generated evidence, generated telemetry,
default facility fallbacks, browser-only persisted records, seed scripts, and
component-local default metrics.

## Findings

| Signal | Count |
| --- | --- |
| Production files generating non-deterministic values (`Math.random`) | 44 |
| Files carrying mock / demo / fixture symbols | 87 |
| Distinct source files in the snapshot | 135 |
| `data_centre_twins` rows | 25 |
| `simulation_runs` rows | 0 |

Largest concentrations:

| File | `Math.random` occurrences |
| --- | --- |
| `src/twins/sovereignDataCenter/mockData.ts` | 56 |
| `src/lib/generators/mockSimulationData.ts` | 23 |
| `src/components/data-centre-twin/domains/NetworkDomainView.tsx` | 11 |
| `src/twins/dataCenter/mockData.ts` | 10 |
| `src/components/twin-visualization/CoolingOverlayLayer.tsx` | 8 |
| `src/components/builder/step5/BuilderPreviewEngine.ts` | 8 |
| `src/components/dc-twin/tabs/DCSimulationTab.tsx` | 7 |
| `src/components/auth/BackgroundGrid.tsx` | 7 (decorative only) |

Full per-file listing: `mock-removal-matrix.csv` (140 entries).

## Frozen snapshot

`AURA_LEGACY_SYNTHETIC_BASELINE_V1` in `legacy-baseline-snapshot.json` records
per-file SHA-256 checksums, an aggregate checksum, database row counts, creation
assumptions and known reliability limitations. It is marked Archived, Synthetic,
Not authoritative, Not operational, Excluded from default views. **Nothing was
deleted**: rollback and audit history are intact.

## Removal status

**0 of 140** legacy sources have been removed from runtime. The reference
baseline exists and is provenance-complete, but the page-by-page cutover
(Phase 7) has not been executed, so every page still reads its previous source.
The ratchet guard in `src/data/dsxReference/__tests__/mockDataGuard.test.ts`
prevents the count from growing.

# AURA DSX reference-baseline cutover - final report

## What was completed

1. **Phase 0/1** - Reconciled 86 route declarations into
   `page-data-coverage-matrix.csv` and swept the codebase for synthetic data:
   44 production files generating non-deterministic values, 87 files carrying
   mock/demo/fixture symbols, 140 catalogued entries in
   `mock-removal-matrix.csv`. Froze `AURA_LEGACY_SYNTHETIC_BASELINE_V1` with
   per-file SHA-256 checksums for 135 files plus database row counts
   (`data_centre_twins` 25, `simulation_runs` 0). Nothing deleted.
2. **Phase 2** - Licence gate executed. The NVIDIA Software License Agreement
   does not clearly authorize third-party public redistribution, so raw source
   material is `REQUIRES_LEGAL_REVIEW` and is never committed; derived
   normalized metadata is `APPROVED_AUTHENTICATED_DEMO`; the NGC archive is
   `BLOCKED`.
3. **Phase 3 (GitHub only)** - Pinned commit `d940314d`, downloaded five files
   server-side, verified SHA-256, deterministic parse via
   `scripts/dsx-reference/ingest.mjs` which aborts on any checksum drift.
4. **Phase 4** - Provenance-complete reference-data model
   (`src/data/dsxReference/types.ts`) with all required data classes, facility
   classes and truth states; 65 normalized records emitted.
5. **Phase 5/6** - Reference portfolio (baseline plus Virginia, New Mexico and
   Sweden reference sites) and the Montreal scenario reclassified as
   `Montreal DSX-Aligned AI Factory Scenario`: AURA-authored, derived, simulated,
   not commissioned, not connected, with eight inputs declared Not supplied and
   no NVIDIA site facts borrowed.
6. **Phase 8 (guard only)** - Ratchet test fails the build when new production
   files add non-deterministic value generation or leak raw NVIDIA symbols.
7. **Phase 9 (data layer only)** - Isolation and integrity proven at the data
   layer by 18 new tests.

## What was NOT completed

- **NGC DSX v2.1 dataset**: HTTP 401, no credentials. No USD stage opened, no
  sample CFD/electrical/simulation outputs exist. Zero records in the four
  NGC-dependent data classes.
- **Phase 7 page-by-page migration**: 0 of 86 routes migrated. No page reads the
  reference dataset yet, so every audited surface still renders its previous
  source.
- **Phases 10-12**: role route sweeps, assistant grounding, export lineage,
  admin dataset console, search classification, canary execution, rollback
  rehearsal and publication were not performed.
- **Default facility not switched.** Flipping it before the page-coverage,
  export, assistant and rollback gates pass would violate the stated canary
  policy.

## Mandatory limitation statement

AURA implements a hybrid DSX-aligned architecture. No NVIDIA DSX runtime service
or SimReady-validated capability is claimed. Importing NVIDIA reference data did
not create an `NVIDIA_INTEGRATED` capability, did not promote anything to
`SIMREADY_VALIDATED`, and did not change any capability status. NVIDIA sample
data is reference data, not measured data; NVIDIA hardcoded KPI values are not
live telemetry; NVIDIA sample simulations are not AURA solver runs.

## Verdict

**AURA_DSX_REFERENCE_BASELINE_CUTOVER_PARTIAL**

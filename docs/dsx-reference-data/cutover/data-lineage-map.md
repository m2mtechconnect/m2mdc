# Data lineage map

```text
NVIDIA GitHub repo (pinned d940314d)
   |  server-side fetch, SHA-256 verified
   v
scripts/dsx-reference/ingest.mjs   (idempotent, aborts on checksum mismatch)
   |  deterministic parse, verbatim normalization
   v
src/data/dsxReference/records.generated.ts   (65 provenance-complete records)
   |
   +--> REFERENCE_KPI_VALUE (36) ----> reference facility KPI cards
   +--> REFERENCE_SPECIFICATION (21) -> reference site specification sets
   +--> REFERENCE_CONFIGURATION (6) --> Compare / Blueprint configuration identity
   +--> REFERENCE_SCENARIO (2) -------> thermal and electrical scenario definitions
   |
   v
src/data/dsxReference/facilities.ts
   +--> REFERENCE:        DSX Reference AI Factory Baseline, Virginia, New Mexico, Sweden
   +--> DERIVED_SCENARIO: Montreal DSX-Aligned AI Factory Scenario (AURA-authored, no NVIDIA facts)
   +--> OPERATIONAL:      empty

NGC dsx_dataset v2.1 --X-- HTTP 401, no credentials
   -> SAMPLE_SIMULATION_OUTPUT / SAMPLE_CFD_OUTPUT / SAMPLE_ELECTRICAL_OUTPUT / ASSET_METADATA: 0 records
   -> dependent surfaces render Unavailable
```

Every arrow into the UI is currently **defined but not wired**: Phase 7 page
migration is not executed. No page reads `records.generated.ts` yet.

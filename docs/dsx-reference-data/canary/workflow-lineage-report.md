# Workflow lineage report

| Stage | Canary state |
| --- | --- |
| Simulation input selection | Reference scenarios exposed by `referenceScenarios()` (2 records). Workspace not wired. |
| Durable run creation | Unchanged from the previous remediation: `src/workspace/runPersistence.ts` remains server-authoritative. |
| Compare | `comparableMetric()` enforces same dataset and same unit and refuses when a metric is missing for either configuration. A missing input is never compared as zero. Tested. Panel not wired. |
| Review | Unchanged. Binds to the durable run. |
| Evidence | Record-level source URL, commit, checksum, licence state, ingestion timestamp and normalization rule are all available on `DatasetValue`. Workspace not wired. |
| Export | `toCsv()` / `toJsonExport()` emit dataset id, version, source commit, record id, classification, unit, checksum, facility id, run id, availability state and derivation. An unavailable value exports as its state string, never `0` and never an empty measured value. Tested. |

End-to-end lineage through the live Simulation -> Compare -> Review -> Evidence
-> Export workflow is therefore **not yet demonstrated in the UI**; it is
demonstrated at the module level with tests.

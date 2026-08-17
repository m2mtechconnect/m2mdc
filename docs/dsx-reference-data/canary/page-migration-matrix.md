# Page migration matrix (canary)

Legend: MIGRATED = reads the centralized dataset provider; NOT_MIGRATED = still
reads legacy synthetic data even when the canary is active.

| Surface | Status | Evidence |
| --- | --- | --- |
| `/admin/dataset-registry` (new) | MIGRATED | Consumes all 65 records, facility classification, NGC unavailable states, canary controls and event log |
| Global shell banner | MIGRATED | `DatasetCanaryBanner` renders on every authenticated route when a non-default dataset is in effect, with one-action rollback |
| Dashboard / overview | NOT_MIGRATED | Provider available; KPI cards still read legacy sources |
| Facilities | NOT_MIGRATED | Classification exists in the data layer and is surfaced in the admin registry only |
| Blueprint | NOT_MIGRATED | Specification selectors exist, page not rewired |
| Simulation | NOT_MIGRATED | `referenceScenarios()` exposes the two validated scenarios; the workspace does not consume them yet |
| Compare | NOT_MIGRATED | `comparableMetric()` unit/dataset guard exists and is tested; panel not rewired |
| Review | NOT_MIGRATED | Durable run lineage unchanged from the previous remediation |
| Evidence | NOT_MIGRATED | Record-level provenance is available through `toDatasetValue()`; workspace not rewired |
| Export | PARTIAL | `exportProvenance.ts` produces lineage-complete CSV/JSON and is tested; existing export buttons still use the previous shape |
| Integrations | NOT_MIGRATED | `NOT_CONNECTED` classification exists; page copy unchanged |
| Asset pipeline | NOT_MIGRATED | Unchanged; NGC assets remain blocked, no SimReady promotion |
| Telemetry and analytics | NOT_MIGRATED | Still legacy |
| Subsystem agents | NOT_MIGRATED | Still legacy; no NVIDIA agent/NIM claim introduced |
| Build Twin | NOT_MIGRATED | Reference-configuration templating with confirmation not implemented |
| Deployments / runtime | UNCHANGED | Brev/AWS remain planned lanes; no deployment claimed |
| Admin console | MIGRATED | New registry page linked at `/admin/dataset-registry` |
| AI settings | UNCHANGED | No model or provider change |
| Search | PARTIAL | `searchDataset()` implemented, admin-gated and tested; `/search` page not rewired |
| AURA Assistant | NOT_MIGRATED | Grounding contract not implemented in this phase |
| Support and documentation | NOT_MIGRATED | State glossary not added to `/help` |

**Migrated surfaces: 3. Partial: 2. Not migrated: 16.**

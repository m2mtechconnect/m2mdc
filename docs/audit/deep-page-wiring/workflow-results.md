# Required workflow chains

| Chain | Result | Failure point |
| --- | --- | --- |
| Facility -> Blueprint -> Build twin -> Validation -> Version -> Simulation | BLOCKED_UNVERIFIED | not executed this run; Blueprint tabs (Model, Assets & Systems, Controls, Validation, Versions) render, but no authoring pass was performed |
| Configure -> Run -> Compare -> Review -> Evidence -> Export | WIRED_WITH_LIMITATIONS | steps render and gating is honest, but a run created in one browser profile exists only in that profile: `useWorkspaceStore` is a zustand `persist` store and no write to `public.simulation_runs` exists in the workspace code path |
| Integration -> Configure -> Test -> Monitor -> Telemetry | PLACEHOLDER_OR_DEMO | `/manage/integrations` lists 8 rows; `/connect/monitor` states no ingestion service is connected and labels its jobs as demonstration data |
| Facility -> Telemetry -> Evidence -> Simulation context | BLOCKED_UNVERIFIED | not executed |
| Search -> Result -> Authorized record -> Back | NOT_WIRED (deep link) | `/search?q=montreal` renders the same 393-character empty shell as `/search`; the query parameter is not consumed on mount |
| Admin role change reflected in the application | BLOCKED_UNVERIFIED | mutation testing not executed |
| AI settings -> Assistant behaviour and audit trail | BLOCKED_UNVERIFIED | not executed |
| Asset pipeline -> Preview -> Validation record -> Runtime | WIRED_READ_ONLY | all four admin pages render with real headings and prior validation content; no run triggered |
| Sign Out -> session invalidated -> protected deep link denied | BLOCKED_UNVERIFIED | deliberately deferred to the end of the audit and not reached |

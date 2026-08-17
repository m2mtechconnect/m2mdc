# Claims audit

- No NVIDIA runtime integration is claimed anywhere in the canary UI. The banner
  states: reference data only - not measured, not live, not commissioned, not an
  NVIDIA runtime integration - with the licence statement.
- NGC `dsx_dataset` v2.1 remains HTTP 401; presented as a terminal unavailable
  state. No retry, no credential request, no substitution.
- No SimReady validation is claimed.
- Capability totals unchanged in this phase; no status promoted.
- Production default remains `legacy-synthetic`; `PRODUCTION_DEFAULT_DATASET` is
  the sole default constant.
- Public metadata (index.html title and description) contains no NVIDIA or
  live-data claim.

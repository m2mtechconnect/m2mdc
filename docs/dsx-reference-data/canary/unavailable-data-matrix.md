# Unavailable data matrix

One terminal state, defined once in `valueClassification.ts` as
`NGC_UNAVAILABLE` and rendered by `components/dataset/UnavailableState.tsx`.

| Field | Value |
| --- | --- |
| State | Unavailable |
| Required dataset | dsx_dataset |
| Required version | v2.1 |
| Blocker | NGC authorization required |
| Last attempted status | HTTP 401 |
| Substitution | No data substituted |
| Auto retry | false |

Affected data classes: `SAMPLE_SIMULATION_OUTPUT`, `SAMPLE_CFD_OUTPUT`,
`SAMPLE_ELECTRICAL_OUTPUT`, `ASSET_METADATA` - each holds zero records.

The component renders synchronously with no fetch, no timer and no spinner, so
a permanent loading state is structurally impossible on these surfaces. No NGC
credential is requested, stored, logged or committed, and no retry is issued.

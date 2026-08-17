# Surface registry closure

Migration-free change: `src/data/dataset/surfaceRegistry.ts`.

## Classification decision

| Route | Classification | Why |
| --- | --- | --- |
| `/manage/connections` | `DATASET_NEUTRAL` | Renders `connection_instances`, `connection_health_checks`, `connection_audit_events` and connector catalogue rows read live from the backend. It renders no reference facility KPI, specification, configuration or scenario value, so the pinned NVIDIA reference source cannot and must not supply it. |
| `/admin/platform-readiness` | `DATASET_NEUTRAL` | Renders the DSX capability registry and runtime readiness evidence. Same reasoning: no facility dataset values on the page. |

Neither route was classified as a reference-data consumer to satisfy the test. Both
declare the truthful source in `currentSource`.

## Verification

- `src/data/dataset/__tests__/surfaceCoverage.test.ts` - PASS (4/4), no unclassified routes.
- `datasetCanary.test.ts` (23), `canaryEndToEnd.test.ts` (24), `pageIdentity.test.ts` (7) - PASS.
- Legacy dataset (no query param): both routes render their normal page.
- Reference canary (`?dataset=nvidia-dsx-reference`): both routes stay mounted, as
  `ReferenceRouteGate` only takes over `REFERENCE_DATA_CONSUMER` and
  `REFERENCE_UNAVAILABLE` surfaces.
- Invalid dataset (`?dataset=not-a-dataset`): falls back to the legacy dataset and the
  page renders normally.
- Unauthenticated: both routes redirect to `/`.
- `surfaceForPath` still returns `null` for unknown paths - unknown routes are not
  silently defaulted; the coverage test is what forbids new holes.

Browser evidence (localhost, engineer identity):

```
ANON /manage/connections                                  -> /
ANON /admin/platform-readiness                            -> /
AUTH /manage/connections                                  -> /manage/connections           (renders)
AUTH /admin/platform-readiness                            -> /admin/platform-readiness     (renders)
AUTH /manage/connections?dataset=nvidia-dsx-reference     -> renders (not gated)
AUTH /admin/platform-readiness?dataset=nvidia-dsx-reference -> renders (not gated)
AUTH /manage/connections?dataset=not-a-dataset            -> renders (legacy fallback)
```

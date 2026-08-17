# Route reconciliation

Three previously reported counts existed. They measure different things:

| Figure | Meaning | Value |
| --- | --- | --- |
| 83 | Routes exercised at runtime by the deep page-wiring sweep (excludes dev-only and alias targets already covered) | 83 |
| 86 | Rows in `page-data-coverage-matrix.csv` (route declarations counted at the time of the cutover phase) | 86 |
| 87 | Unique `<Route path="...">` declarations present in `src` today | 87 |
| 26 | Alias entries in `src/config/routeAliases.ts` (redirects, not destinations) | 26 |

**Authoritative current count: 87 unique route path declarations**, plus 26
aliases that redirect into them. The delta from 86 to 87 is
`/admin/dataset-registry`, added by this phase. The delta from 83 to 86 is
dev-only routes (`/dev-overlays`), the `NotFound` catch-all (`*`) and nested
index routes that the runtime sweep folded into their parents.

No route was removed, renamed or re-permissioned in this phase.

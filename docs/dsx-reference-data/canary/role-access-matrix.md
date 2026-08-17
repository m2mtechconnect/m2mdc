# Role access matrix

| Caller | `?dataset` absent | `?dataset=legacy-synthetic` | `?dataset=montreal-derived` | `?dataset=nvidia-dsx-reference` | `?dataset=garbage` | `/admin/dataset-registry` |
| --- | --- | --- | --- | --- | --- | --- |
| Anonymous | default | default | n/a (route requires auth) | denied -> default | default | redirected to public entry |
| Authenticated non-admin | default | default | montreal-derived | `unauthorized-fallback` -> default | `invalid-value-fallback` -> default | "Not authorized" panel, no records rendered |
| Administrator (`platform.view_admin_console`) | default | default | montreal-derived | active canary | fallback | full registry |

Enforcement: `resolveDataset()` (unit-tested, 4 access cases) plus the RBAC
permission check in `DatasetProvider` and in the registry page. A non-admin
cannot obtain reference records through the provider, `searchDataset()` (which
is only reachable behind the provider) or the export helpers, because all three
are reached only when the resolved mode is `nvidia-dsx-reference`.

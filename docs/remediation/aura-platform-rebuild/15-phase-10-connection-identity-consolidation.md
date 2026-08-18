# Phase 10 - Connection identity consolidation and orphan surface removal

## Measured state (live database)

| Table | Rows | Client readers | Edge-function users |
|---|---|---|---|
| `connection_instances` | 5 | `src/connections/api.ts`, `RuntimeDiagnosticsPanel.tsx` | connection-provision, connection-credential, connection-health-check, managed-connector-invoke, managed-connector-verify, canary-deploy |
| `app_user_connections` | 0 | none (service role only, by design) | managed-user-oauth-* |
| `managed_user_connections` | 0 | owning user only | managed-user-* |
| `integrations_connections` | 0 | none | legacy Zapier generation (7 functions) |
| `dsx_connections` | 0 | none | `dsx-ingest` only |

## Conclusion

`connection_instances` is already the only connection identity the application
reads; the two legacy generations are edge-function-only and hold no rows. No
merge migration is justified by the data, and none was performed.

`dsx_connections` is deliberately **not** merged into `connection_instances`: it
carries ingest-authorization semantics (`gateway_jwt_key_ref`,
`allowed_source_subjects`) that gate a service-role write path, which is a
different security boundary from a user-managed connection record. The
family-level rule in `05-table-migration-map.md` (do not merge across differing
security or audit semantics) applies.

## Orphan surface removed

`src/components/integrations/` contained 12 components; only three had a mount
point (`NvidiaDsxReadinessPanel` via `/admin/platform-readiness`,
`ZapierIntegrationCard` and `IntegrationActivityLog` via the builder Connect
step). The nine unreferenced components were deleted:

`FieldMapper`, `IntegrationCard`, `IntegrationDrawer`, `IntegrationFilters`,
`IntegrationMarketplace`, `IntegrationStatusBadge`, `ZapierAppCard`,
`ZapierConnectModal`, `ZapierMarketplace`.

They shipped an integration-marketplace experience with no route, no navigation
entry and no data path - a second, unreachable answer to a question the
`/manage/connections` control plane already answers.

## Verification

- `bunx tsgo --noEmit`: no diagnostics after deletion (nothing imported them).
- New `src/connections/__tests__/connectionIdentity.test.ts` (3 cases): asserts
  no client query against either legacy connection table, that client reads go
  through `connection_instances`, and that the deleted components are not
  re-added without a mount point.

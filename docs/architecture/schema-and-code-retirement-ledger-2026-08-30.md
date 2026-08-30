# AURA DC schema and code retirement ledger

- Status: proposed cleanup program
- Baseline commit: `1fa9f5ed3e7ee70a9adbd17eaf3a1d2667cb228d`
- Destructive actions authorized by this document: none

This ledger exists to prevent “clean code” work from becoming an unsafe bulk
deletion. Static non-use is a lead, not proof. Every removal needs an owner,
replacement, consumer evidence, data decision, rollback path and a separate
reviewable change.

## Status vocabulary

| Status | Meaning |
|---|---|
| Keep | Current responsibility is distinct and supported by evidence |
| Canonical candidate | Proposed system of record; requires an accepted ADR |
| Migrate | Active consumers exist and must be moved before retirement |
| Verify | No complete consumer proof yet; do not delete |
| Retire eligible | All deletion gates below have passed |
| Historical | Immutable migration history; never rename or delete |

## Data-model ledger

| Domain | Object | Evidence at baseline | Proposed status | Required next proof |
|---|---|---|---|---|
| Identity | `organizations` | 5 static consumers, 9 incoming relationships | Keep | Confirm every org-owned table has a valid scope path |
| Identity | `org_memberships` | `org_id`, `user_id`, organization FK | Keep | Contract tests for role and cross-org denial |
| Facility | `data_centre_twins` | 12 consumers, `org_id`, 3 outgoing and 15 incoming relationships | Canonical candidate | Accept ADR; remove dependency on legacy `digital_twins` blueprint row |
| Facility | `digital_twins` | 10 consumers, primarily legacy `digital-twin-*` Edge Functions | Migrate | Inventory deployed/external callers and map config fields to canonical model |
| Facility | `sovereign_dc_facilities` | 0 static consumers; 2 incoming relationships | Verify | Inspect row counts, scheduled/SQL callers and dependent run rows |
| Simulation | `simulation_runs` | 8 consumers; rich checksum, provenance, provider and verification fields | Canonical candidate | Characterization tests and tenant-FK decision |
| Simulation | `digital_twin_runs` | 4 legacy API consumers | Migrate | Compatibility adapter and production usage evidence |
| Simulation | `twin_simulation_runs` | 0 static consumers; FK to canonical twin | Verify | Data count, SQL/schedule/external caller search |
| Simulation | `sovereign_dc_simulation_runs` | 0 static consumers; FK to dormant facility model | Verify | Data and retention decision with `sovereign_dc_facilities` |
| Connections | `connector_definitions` | Global catalog; parent of `connection_instances` | Keep | Explicit global-catalog classification and read-policy test |
| Connections | `connection_instances` | 10 consumers; tenant scoped; credential reference instead of browser secret | Canonical candidate | Add/verify organization relationship without weakening current policies |
| Connections | `managed_user_connections` | 5 OAuth lifecycle consumers; tenant and user scoped | Keep | Document it as grant/consent, not a duplicate connection instance |
| Connections | `app_user_connections` | 1 shared Edge Function consumer; encrypted key link | Verify | Confirm provider scope and migration path into server-owned credential references |
| Connections | `integrations` | 11 legacy integration/Zapier consumers; org scoped but no generated FK | Migrate | Foreign-key/orphan audit and provider-by-provider compatibility map |
| Connections | `integrations_connections` | 7 Zapier/token consumers; org scoped but no generated FK | Migrate | Vault reference coverage and token-erasure proof |
| Connections | `dsx_connections` | DSX ingest consumer; org and twin FKs | Keep specialized | DSX contract, custom-auth and freshness tests |
| Connections | `system_integrations` | One delete-path consumer; FKs to integration and agent | Verify | Confirm junction ownership and cascade semantics |
| Deployment | `deployments` | Deployed read-only audit: 0 rows; no agent/user/org FKs; no org scope; owner-only RLS | Keep, harden first | Qualify prepared forward migration across organization personas and legacy null-org agents |
| Deployment | `deployment_events` | Deployed read-only audit: 0 rows; parent FK only; broad authenticated grants | Keep with parent | Qualify parent-scoped RLS, server-derived authority and append-only grant contract |
| Deployment | `deployment_tracking` | Deployed read-only audit: 0 rows; authenticated/anon grants already revoked | Delayed retirement candidate | Prove no external/report consumers and complete the removal evidence packet |
| Deployment | `cloud_deployments` | One AOC consumer; agent/environment FKs | Keep specialized | Document boundary from general deployment record |
| Templates | `agent_templates` | 4 consumers | Keep | Global-catalog read policy and versioning rules |
| Templates | `dc_blueprint_templates` | 3 facility-scan/create consumers | Keep | Rename UI language to blueprints, not marketplace |
| Templates | `industry_templates` | 1 wizard-store consumer | Verify | Decide whether to migrate wizard to agent/blueprint templates |
| Templates | `m2m_templates` | 0 static consumers and no generated relationships | Verify | Row/data/external-call proof; likely first table retirement candidate |

## Other isolated-table candidates

The inventory also found these isolated candidates:

`ai_recommendations_cache`, `asset_canary_events`, `capture_cache`,
`dsx_asset_mappings`, `dsx_events_quarantine`, `dsx_gateway_heartbeats`,
`dsx_ingestion_audit`, `industry_agents`, `public_intake_rate_limits`,
`role_change_audit`, `search_analytics`.

Several names clearly represent audit, quarantine, rate-limit, cache or operational
data. Those tables can be intentionally isolated and must not be deleted merely
because the browser has no direct caller.

## Code-family ledger

| Area | Current evidence | Proposed action | Deletion gate |
|---|---|---|---|
| `src/context` and `src/contexts` | Both directories exist; both twin contexts are referenced by static inventory | Select one public context boundary and migrate importers | Route, reload and cross-tab state tests; zero importers of retired path |
| Facility/twin components | `data-centre-twin`, `digital-twin`, `twin-visualization` and `twins/**` families coexist | Organize behind `domains/facility` and `domains/twin-visualization` public APIs | Screenshot, keyboard, loading, data and import-contract tests |
| Builder state | Multiple builder stores and component families remain | Choose one state machine; adapters first | Existing draft reload, resume, delete and facility-switch journeys pass |
| Simulation | ADR-0001/0007 consolidation is partial; canonical API exists while enhanced/legacy paths remain | Complete caller migration one provider at a time | Deterministic outputs, provenance and user-journey parity |
| Marketplace/template UI | Retired product language still has source candidates | Remove navigation/product surface; retain only domain catalog services actually used | Route registry, deep-link compatibility and caller inventory |
| Route registry | Runtime and test registries have drifted before | One typed runtime registry with tests consuming the same export | No retired labels/routes; active-facility resolver covered |
| Edge Functions | 165 directories, 42 static invocations, 25 configured, 22 declared production | Classify each as browser, webhook, schedule, external, disabled or retirement candidate | Deployment list, logs, allowlist and external contract evidence |
| Unreachable runtime source | 176 static-graph candidates | Triage by domain; never bulk-delete | Dynamic/asset/story/generated check plus one-file or one-family review |

## Naming standard for new and changed objects

### Database

- Tables: plural `snake_case` nouns, e.g. `simulation_runs`.
- Primary key: `id` (`uuid` unless a documented external identifier requires
  another type).
- Foreign key: singular referenced noun plus `_id`, with a real constraint unless
  an ADR documents why not.
- Organization ownership: use `org_id -> organizations.id` for new business-domain
  tables. Existing `tenant_id` columns are not renamed until their semantics,
  policies and data are proven equivalent.
- User/audit actors: use `created_by`, `updated_by`, `requested_by` or `actor_id`
  according to role. Avoid adding new generic `user_id` columns when the role matters.
- Time: `_at` in UTC; duration includes unit, such as `duration_ms`.
- Status: constrained enum or documented state machine, never free-form ambiguity.
- Secrets: store only vault/credential references in application tables.

### Migrations

New migrations use:

```text
YYYYMMDDHHMMSS_<verb>_<domain>_<object>.sql
```

Examples:

```text
20260830153000_add_org_fk_to_deployments.sql
20260830160000_backfill_deployment_org_scope.sql
20260830163000_enforce_deployment_org_scope.sql
```

The 70 historical opaque filenames remain immutable. Fixing history by renaming or
deleting applied migrations would make environments less reproducible.

### Edge Functions and source modules

- Edge Functions: `<domain>-<verb>` with one bounded responsibility.
- React/domain source: domain nouns, not product slogans or temporary campaign names.
- Public imports enter through a domain `index.ts` or `api.ts`; internal paths are
  not imported by other domains.
- Test names describe behaviour and persona outcome, not implementation detail.

## Removal evidence packet

An item can move to **Retire eligible** only when one evidence packet contains:

1. Exact commit and deployed schema/version inspected.
2. Static callers, dynamic callers, SQL/RPC, schedules, webhooks, external clients
   and deployment allowlists checked.
3. Row count, newest/oldest row, orphan count and retention requirement recorded.
4. Replacement object/API named, with field and semantic mapping.
5. Tenant/RLS/policy comparison and cross-tenant denial tests.
6. Compatibility period and production telemetry proving zero old-path use.
7. Backup/rollback procedure tested.
8. Expansion migration, caller migration and contraction migration kept separate.
9. Full qualification passes without weakening tests.

For source deletion, replace database row evidence with runtime import/bundle,
route, lazy-load, feature-flag and visual/user-journey evidence.

## First safe implementation slices

1. **Deployment ownership remediation** — investigation complete; a forward-only
   migration is prepared but not applied. Qualify the organization/persona matrix,
   legacy null-org compatibility, restrictive grants and cross-tenant denial.
2. **Template consolidation characterization** — map the one
   `industry_templates` consumer and inspect `m2m_templates` deployed data.
3. **Facility/twin compatibility contract** — document why
   `data_centre_twins.blueprint_id` currently points to `digital_twins.id`, then
   introduce a named adapter before changing either table.
4. **Edge Function classification** — reconcile all 165 directories with deployed
   functions, schedules, webhooks, static callers and the default-deny allowlist.
5. **Source boundary pilot** — migrate one small domain behind a public API, enforce
   dependency direction, then remove only the proven-unused legacy imports.

No table or old source family should be deleted in the same change that first
introduces its replacement.

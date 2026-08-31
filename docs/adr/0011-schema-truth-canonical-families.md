# ADR 0011 — Schema truth and canonical table families

Status: Proposed for review. This ADR authorizes no migration or deletion.

## Decision

- Organization authority: `organizations` plus `org_memberships`.
- Facility authority: `data_centre_twins`; `digital_twins` remains a compatibility model.
- Simulation authority: `simulation_runs`; other run families remain transitional pending consumer and row evidence.
- Managed connections: `connector_definitions` plus `connection_instances`; user OAuth grants and DSX bindings remain specialized.
- Deployment evidence: `deployments` plus `deployment_events`; provider-specific deployment tables remain specialized.

These are decision boundaries, not rename or drop instructions. A family can move
from transitional to retirement-eligible only after deployed metadata, consumers,
row counts, retention, RLS parity, cross-tenant denial, compatibility observation,
and rollback evidence are recorded at one exact SHA.

## Drift contract

Migration inventory and generated-type checksum are pinned in
`docs/architecture/schema-truth/exact-head-manifest.json`. Deployed metadata is a
separate optional input and missing evidence remains explicit. Any difference fails
the comparator; it never updates the baseline automatically.

## Consequences

No historical migration is edited. No table is deleted. Future schema changes are
forward-only, tenant-safe, and separately qualified from application cutover.

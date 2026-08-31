# Schema Truth Layer

Baseline: `64da468804a426dcdd356912c4a68ba60f73bdf7`.

This layer compares three authorities without treating any one as sufficient:

1. immutable migration history;
2. generated Supabase client types;
3. an optional read-only deployed metadata snapshot.

`node scripts/schema-truth/verify-schema-truth.mjs` verifies exact generated-object
names, the generated-type file, the migration filename inventory, and normalized
SQL contents. This makes edits to immutable historical migrations fail closed. Pass
`--deployed=<snapshot.json>` only for an authorized metadata-only export containing
sorted `tables`, `views`, and `functions` arrays. Absence of deployed metadata is
reported as `not-provided`, never inferred as matching.

The ownership catalogue remains the exact-head output of
`scripts/audit-architecture-inventory.mjs`: direct `org_id`, `organization_id`, or
`tenant_id` paths are organization-owned; direct actor keys are user-owned;
relationship-derived paths inherit their parent authority; unresolved paths require
explicit global-catalog or defect classification. No unresolved object is eligible
for deletion.

Cross-tenant denial uses `scripts/phase3/rls-matrix.sql` in an ephemeral Supabase
stack. It creates two isolated organizations, executes assertions as the
`authenticated` role, covers read/write/relationship forgery, and rolls back the
transaction. Static policy inspection is not runtime denial evidence.

No production rows, credentials, or customer identifiers belong in Schema Truth
artifacts.

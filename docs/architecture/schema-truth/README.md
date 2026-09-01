# Schema Truth Layer

This layer compares three authorities without treating any one as sufficient:

1. immutable migration history;
2. generated Supabase client types;
3. a read-only deployed metadata snapshot for release qualification.

`node scripts/schema-truth/verify-schema-truth.mjs` verifies exact generated-object
names, the generated-type file, the migration filename inventory, and normalized
SQL contents. This makes edits to immutable historical migrations fail closed. The
manifest `sourceSha` is the latest commit that changed the generated types or
migration directory; the verifier derives that commit again and fails when the pin
is stale. The result also records the exact audited `HEAD`.

Release qualification requires `--deployed=<snapshot.json>` or the
`AURA_DEPLOYED_SCHEMA_SNAPSHOT` environment variable. The authorized metadata-only
snapshot must use schema `aura.deployed-schema.v1`, identify the exact audited HEAD in
`sourceSha`, contain an ISO `capturedAt`, and provide sorted `tables`, `views`, and
`functions` arrays. Missing or stale deployed evidence fails closed.

For local repository consistency only, run
`node scripts/schema-truth/verify-schema-truth.mjs --repository-only`. Its verdict is
`PASS_REPOSITORY_ONLY`, which must never be presented as deployed or release evidence.

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

# ADR-0008: Domain, data and retirement governance

Status: Proposed

## Context

AURA has accumulated overlapping facility, simulation, connection, deployment and
template models. UI qualification can prove that a route renders, but it cannot
prove that backend tables are named consistently, connected to the organization
boundary or safe to retire. Static reachability also cannot see every scheduled,
webhook, SQL or external caller.

At commit `1fa9f5ed3e7ee70a9adbd17eaf3a1d2667cb228d`, the generated client
contract contains 140 tables and 112 declared relationships. The repository has
165 Edge Function directories, while only 42 have a direct static invocation, 25
are explicitly configured in `supabase/config.toml` and 22 are declared production
by the default-deny route allowlist. These sets answer different questions and
cannot be treated as interchangeable deletion evidence.

## Decision

### 1. Exact-head inventory precedes architecture recommendations

Every structural recommendation cites an exact commit and is regenerated from:

- generated schema types;
- migration history;
- RLS and policy evidence;
- foreign-key relationships;
- static table, RPC and function consumers;
- deployed-function, schedule, webhook and external-caller evidence when the
  recommendation could remove or rename an object.

Old audit prose is supporting context, never the source of truth.

### 2. Organize application code by product domain

New and migrated application code follows:

```text
src/domains/<domain>/{api,model,ui,routes,tests,index.ts}
```

`index.ts` is the reviewed public surface. Cross-domain code imports only public
surfaces. Generic `components`, `lib` and `utils` folders receive only genuinely
shared primitives, not new domain implementations.

### 3. Use one business-tenant vocabulary for new schema

The business tenant is an organization. New organization-owned tables use
`org_id` with a declared foreign key to `organizations.id` and RLS that fails
closed. Existing `tenant_id` columns remain unchanged until a compatibility and
policy audit proves they have the same meaning. No bulk rename is allowed.

Intentional global catalogs must be explicitly documented and tested as read-only
or role-restricted. A missing organization foreign key is never silently treated as
global.

### 4. Schema changes use expand, migrate, contract

Destructive changes are split into independently reviewable stages:

1. expand with the new object/column/API and compatibility path;
2. backfill in bounded batches and verify counts/checksums;
3. migrate callers and observe production use;
4. contract only after zero-use and rollback evidence.

Applied migration files are immutable. They are never renamed, edited or deleted.
Every new migration has one purpose and a descriptive UTC name.

### 5. “Unused” requires multi-source proof

No code, table, function, policy, route or migration is deleted from static-import
results alone. The retirement packet defined in
`docs/architecture/schema-and-code-retirement-ledger-2026-08-30.md` is mandatory.
Audit, quarantine, cache, rate-limit and operational objects are presumed to have
non-browser consumers until disproven.

### 6. Canonical models are selected by accepted follow-up decisions

The current audit proposes `data_centre_twins`, `simulation_runs` and
`connection_instances` as canonical candidates. This ADR establishes the selection
and retirement process; it does not itself authorize those consolidations. Each
domain receives characterization tests and a small follow-up ADR or implementation
plan before caller or schema changes.

### 7. Architecture drift becomes a qualification concern

The repeatable inventory command is `npm run audit:architecture`. Qualification
must fail or stop for review when a changed domain introduces:

- a table without RLS/policy migration evidence;
- an organization-owned table without an explicit scope decision;
- a second implementation without a public-boundary decision;
- a privileged browser credential;
- a destructive migration without expansion/backfill/rollback evidence;
- a new function that is not classified by caller and deployment mode.

Historical counts are observations, not permanent allowed baselines.

## Consequences

- Cleanup becomes slower per deletion but faster overall because the replacement,
  ownership and rollback are explicit before coding.
- Large “delete old code” changes are rejected; one domain or one compatibility
  seam is changed at a time.
- The current 70 opaque migration filenames stay in history. New opaque filenames
  are prohibited.
- The deployment and template families are investigated before the first schema
  consolidation because they expose the clearest scope and duplication questions.
- RLS, tenant isolation, auth, CORS, provenance and server-owned credentials remain
  non-negotiable throughout consolidation.

## Pattern sources

The process was informed, without copying source code, by these pinned public
repositories:

- Supabase `86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94` — descriptive migrations
  and same-change RLS/policies.
- PostHog `e0f5c3492380e64f2f8c1d549486413481ca3b6f` — product slices and staged
  destructive migrations.
- Backstage `d5731882a9a45a6dea41df40ce9c25dafc2b4859` — ADRs and explicit public
  package boundaries.
- Mattermost `c8b1cc0046c9ab53de4cb33804a7b4bc5cd03a83` — single-purpose,
  backward-compatible and realistically tested migrations.

These are candidate patterns. AURA's code, production evidence and security
contracts decide whether a pattern applies.

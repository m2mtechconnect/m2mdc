# Legacy twin model retirement (governance record)

Status: retired-in-place (no deploy, no schema change)

## Evidence

Read-only verification performed against the connected managed backend:

| Object | Rows |
| --- | --- |
| `public.data_centre_twins` (canonical) | 27 |
| `public.digital_twins` (legacy) | 0 |
| `public.digital_twin_runs` (legacy) | 0 |

Client verification on the current head:

- No file under `src/` reads `digital_twins` (enforced by
  `tests/unit/twin-model-canonicalization-contract.test.ts`).
- No client code invokes any `digital-twin-*` edge function.
- All nine `digital-twin-*` functions carry
  `production_disposition: "unknown-blocked"` with `consumer_count: 0` in
  `docs/remediation/evidence/pr-0.1/edge-function-inventory.json`, so they are
  outside the production perimeter today.

## Decision

The legacy `digital_twins` model is retired in place:

1. `data_centre_twins` is the single canonical twin read model for the client.
2. The legacy `digital-twin-*` functions stay blocked from the production
   allowlist and must not acquire client consumers.
3. Deleting the legacy function sources, dropping the legacy tables, or
   removing their deployed counterparts is deliberately deferred: those are
   backend-contract and DB actions that require an explicit, separately
   authorized release pass. Nothing here deploys or mutates the database.

`tests/unit/legacy-twin-function-retirement-contract.test.ts` enforces items 1
and 2 so the fork cannot silently reopen.

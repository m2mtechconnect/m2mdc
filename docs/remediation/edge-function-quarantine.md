# Edge function quarantine register

Status: governed retire-in-place decision. No deletion, no deployment, no
schema or contract change is authorized by this record.

## Finding

The platform duplication audit identified a large set of edge functions under
`supabase/functions/` with no caller anywhere in the repository (`src/`,
`scripts/`, `tests/`). They are candidate-dead code: they may still exist in the
managed backend, but nothing in this codebase reaches them, so their behaviour
cannot be qualified by this repository's gates.

## Decision

Quarantine in place.

- The functions stay on disk and stay outside the production perimeter.
- They remain absent from
  `docs/remediation/evidence/pr-0.1/edge-function-promotions.json`.
- Deleting the sources or removing the deployed functions from the managed
  backend requires a separately authorized release pass, because deployed
  functions are backend state and this repository has no evidence of external
  callers either way.

Removing a function from the register is only correct when a real caller lands
in the repository, or when a separately authorized pass deletes the function.

## Register

`docs/remediation/evidence/pr-0.1/edge-function-quarantine.json` holds the
authoritative list (88 functions at the time of writing) plus the criteria used
to derive it.

## Enforcement

`tests/unit/edge-function-quarantine-contract.test.ts` asserts that:

1. every registered function still exists under `supabase/functions/`;
2. no registered function is promoted to the production perimeter;
3. no registered function has acquired a repository caller without also being
   removed from the register.

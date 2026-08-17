# Test count reconciliation

| Quantity | Value |
| --- | --- |
| Command | `npx vitest run` (vitest 4.0.6, jsdom, tests/setup.ts) |
| Collected | 1625 |
| Passed | 1534 |
| Failed | 0 |
| Skipped (gated) | 91 |
| Todo | 0 |
| Test files collected | 151 |
| Playwright cases excluded by config | 928 (not runnable under vitest) |

## The 1,534 vs 1,678 question

`1,534` was never a collection total: it is the **passed** count. The collected
total is **1,625**. Against the earlier `1,678` collected, the delta is **53**,
not 144, and it is fully attributable:

- 188 test cases were removed with the obsolete aviation/YVR-era suites
  (`tests/integration/yvr-*.test.ts` 119, `tests/unit/yvr-*.test.ts` 69) in
  commit `9a7e83af`. These were retired because the non-DC templates they
  asserted were hard-deleted from the product; `tests/unit/non-dc-templates-removed.test.ts`
  now asserts their absence.
- 135 cases were added since that revision (dataset canary, page identity,
  surface coverage, run export, provenance, DSX capability and claims suites).
- Net: 1,678 - 188 + 135 = 1,625. Reconciled.

`tests/unit/__probe.test.ts` (0 cases) and a `.ts`→`.tsx` rename of
`tests/integration/builder-flow` are collection-neutral.

## Skipped 91

All 91 come from `describeWithBackend` (`tests/_setup/backendSuite.ts`), which
gates suites that require the disposable `aura-dc-security-test` backend. That
project is not provisioned in this environment, so the assertions were never
evaluated. They are recorded **BLOCKED_UNVERIFIED**, not passing. No test was
deleted, renamed, skipped or excluded in order to obtain a green result.

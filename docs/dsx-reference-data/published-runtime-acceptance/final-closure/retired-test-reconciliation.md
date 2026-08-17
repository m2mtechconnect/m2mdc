# Retired aviation-era tests - reconciliation

Removing revision: `9a7e83af` ("Changes", 2026-08-17). Reason: the aviation/YVR
vertical was hard-deleted from the product (see `mem://architecture/hard-delete-non-dc-templates`
and `tests/unit/non-dc-templates-removed.test.ts`), so the suites asserted
templates, routes and flows that no longer exist. Removal was a consequence of
product scope, not of chasing a green result; the replacement assertion
(`non-dc-templates-removed.test.ts`) fails if any aviation template returns.

| File (deleted) | Cases | Runner |
| --- | --- | --- |
| tests/integration/yvr-builder-wiring.test.ts | 31 | vitest |
| tests/integration/yvr-deployment-validation.test.ts | 22 | vitest |
| tests/integration/yvr-intake-flows.test.ts | 17 | vitest |
| tests/integration/yvr-preview-tabs.test.ts | 35 | vitest |
| tests/integration/yvr-template-integration.test.ts | 14 | vitest |
| tests/unit/yvr-analytics-events.test.ts | 16 | vitest |
| tests/unit/yvr-template-integrity.test.ts | 53 | vitest |
| **vitest total** | **188** | |
| tests/e2e/yvr-builder-deploy.spec.ts | 11 | playwright (excluded config) |
| tests/e2e/yvr-marketplace-flow.spec.ts | 15 | playwright |
| tests/e2e/yvr-template-flow.spec.ts | 9 | playwright |

Counts were taken from `git show 9a7e83af^:<path>` at the deleting revision, so
the 188 figure is measured, not asserted.

Equivalent coverage: builder wiring, intake and template behaviour are covered
for the Data Centre master template by `tests/unit/templateLoader.test.ts`,
`tests/unit/open-builder-with-template.test.ts`,
`tests/integration/intake-blueprint-flow.test.ts` and
`src/data/dataset/__tests__/*`. Analytics-event and preview-tab assertions have
no Data Centre replacement yet - recorded as a coverage gap, not as a pass.

Reconciliation: 1,678 (previous collected) - 188 retired + 135 new dataset/DSX
cases = 1,625 collected today.

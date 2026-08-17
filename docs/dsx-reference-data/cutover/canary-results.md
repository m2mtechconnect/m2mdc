# Canary cutover results

Dataset modes are declared in `src/data/dsxReference/types.ts` and
`facilities.ts`: `legacy-synthetic`, `nvidia-dsx-reference`, `montreal-derived`.

| Gate | Status |
| --- | --- |
| Admin preview | NOT RUN |
| Engineer preview | NOT RUN |
| Page-coverage reconciliation | NOT RUN (0 of 86 routes migrated) |
| Dataset count reconciliation | PASS (65 records, counts asserted by test) |
| Export validation | NOT RUN |
| Assistant grounding validation | NOT RUN |
| No-mock-fallback test | PARTIAL (ratchet guard active; 140 legacy sources still present) |
| Rollback test | NOT RUN |
| Default-facility switch | **NOT PERFORMED** |

The default demonstration facility has **not** been switched. Because the
page-coverage, export, assistant and rollback gates did not run, flipping the
default would violate the stated canary policy. `DEFAULT_DATASET_MODE` is
declared as `nvidia-dsx-reference` in the data layer, but no runtime consumer
reads it yet, so the live application is unchanged.

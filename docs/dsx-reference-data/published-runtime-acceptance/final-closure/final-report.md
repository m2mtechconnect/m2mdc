# NVIDIA DSX reference-data canary - read-only acceptance closure

## Verdict

**AURA_DSX_REFERENCE_READ_ONLY_CANARY_PARTIAL**

The previous VERIFIED_WITH_LIMITATIONS claim is withdrawn: the acceptance rules
require the full route/alias matrix, four sessions, exports, Search, Assistant,
RLS authorization and the rollback drill, and those remain unexecuted.

## Deployment

| Field | Value |
| --- | --- |
| Canonical host | https://auradc.m2mtechconnect.com |
| Previous bundle | assets/index-C22J_hmq.js |
| New bundle | assets/index-CCUS0faN.js (HTML references it; confirmed live) |
| Git revision before change | 74828541 |
| Production default before/after | legacy-synthetic / legacy-synthetic |
| Capability totals before/after | unchanged |

## Read-only naming

Done. The canary is now labelled **NVIDIA DSX Reference - Read-only** with the
full truthful qualifier set (see `read-only-canary-contract.md`). Montreal and
the four reference facilities were not renamed or merged.

## Tests

1,534 executable tests passed, 0 failed, 91 backend-dependent tests remain
BLOCKED_UNVERIFIED, 928 Playwright cases handled separately (38 executed:
30 passed, 8 environment-blocked). Typecheck clean. The 188 retired
aviation-era vitest cases are itemised with measured counts, removing revision
and reason in `retired-test-reconciliation.md`; removal followed the hard delete
of the aviation vertical, not a green-result objective.

## Security

No `USING (true)` read policy remains on the affected tables; anonymous reads
return 401 both before and after, so this is a closed latent defect, not a
demonstrated breach. Engineer same-tenant and cross-tenant authorization remain
BLOCKED_UNVERIFIED, so security closure is incomplete.

## Not executed (why the verdict is PARTIAL)

Full 87-route / 26-alias matrix across four sessions (the sweep exceeded the
execution time limit), engineer session, export downloads, Search deep links,
Assistant grounding, evidence-beta re-verification on the new bundle,
audit-event read-back, responsive/accessibility breakpoints, and the published
rollback drill. Each is recorded BLOCKED_UNVERIFIED in its own file; none is
inferred from unit assertions or from the previous bundle.

## Standing limitations

NGC `dsx_dataset` v2.1 remains HTTP 401 and unavailable; reference mode is
read-only; no NVIDIA DSX runtime service; no SimReady validation; legacy visual
debt outside the canary.

## Files changed

- `src/data/dataset/datasetRegistry.ts` (read-only label and qualifier text)
- `src/components/dataset/DatasetCanaryBanner.tsx` (banner copy)
- `docs/dsx-reference-data/published-runtime-acceptance/final-closure/*` (evidence)

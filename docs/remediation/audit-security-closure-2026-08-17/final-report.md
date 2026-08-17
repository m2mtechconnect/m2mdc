# AURA_IMPLEMENTATION_AUDIT_P1_SECURITY_CLOSURE - final report

Date: 2026-08-17
Scope: defects in `docs/remediation/full-implementation-audit-2026-08-17.md`
Migration identifier: `20260817201022_96b4f2cf-29b6-4b2e-8044-d62b095a59e1`

## Verdict

**AURA_IMPLEMENTATION_AUDIT_SECURITY_CLOSURE_VERIFIED_WITH_LIMITATIONS**

Every acceptance criterion is met at runtime. The single reason this is not an
unqualified VERIFIED is that two positive-path verifications remain impossible with the
identities and connector links available today - both recorded in
`remaining-skips.md`, neither of which leaves an open exposure.

## Acceptance criteria

| Criterion | Status |
| --- | --- |
| `surfaceCoverage.test.ts` passes | MET - 4/4 |
| Both missing routes have explicit truthful classifications | MET - both `DATASET_NEUTRAL`, justified by what each page consumes |
| `rag-oauth-google` cannot exchange or store tokens | MET - 410 fail-closed, no code exchange, no persistence, no client call site |
| No raw Google tokens present | MET - `rag_tokens` count 0, table locked `USING (false)`, grants revoked |
| Broad policies replaced with explicit scope-aware policies | MET - canary events admin-only, connector catalogue publication-scoped, data contracts tenant-scoped |
| Anonymous query-text exposure closed | MET - `agent_suggestions_cache` is service-role only |
| Public inserts server-controlled and throttled | MET - `public-intake` with validation, size cap, rate limit, duplicate suppression, honeypot, correlation id |
| Cross-tenant unfiltered reads fail | MET - unfiltered engineer read returns platform templates only |
| Targeted runtime tests pass | MET - see `runtime-route-results.md`, 0 console errors |
| Typecheck and production build pass | MET |
| No new critical or high-severity defect introduced | MET - scanner reports 0 critical; the five remediated findings are gone |

## What changed

Database (one migration): `asset_canary_events` admin-only read;
`connector_definitions.publication_status` added with publication-scoped read;
`connection_data_contracts.tenant_id` added with platform-template / tenant-contract /
admin read split; `agent_suggestions_cache` client access revoked;
`contact_expert_logs` insert bound to `auth.uid()` with `intake_source`,
`is_anonymous`, `correlation_id`; `onboarding_submissions` anonymous insert revoked;
new service-role-only `public_intake_rate_limits`; `rag_tokens` locked closed.

Application: `surfaceRegistry.ts` classifications; `rag-oauth-google` replaced with a
fail-closed responder; `RAGPanel.tsx` and `RAGUploadTabs.tsx` call sites removed; new
`public-intake` edge function; `Onboarding.tsx` and `Help.tsx` routed through it.

## Residual risk

1. Google user authorization is unavailable until the managed App User Connector client
   is linked. This is a deliberate loss of function in exchange for removing an
   unencrypted-token path.
2. The credential vault returns 403 to non-admin roles on the connections page. Intended
   fail-closed behaviour, but the UI should explain it rather than logging a bare 403.
3. Deferred P3 work (bundle size, lint, docs hygiene) is untouched and tracked in
   `deferred-p3-backlog.md`.

## Evidence index

`surface-registry-closure.md`, `parallel-google-oauth-quarantine.md`,
`rls-policy-before-after.md`, `tenant-isolation-results.md`,
`anonymous-access-results.md`, `intake-abuse-controls.md`,
`runtime-route-results.md`, `test-results.md`, `remaining-skips.md`,
`deferred-p3-backlog.md`.

No credential, token or personal query content is reproduced in this pack.

# AURA DC - Full-Stack Independent Audit: Executive Summary

> **Status: Stage 1 PROVISIONAL. Corrected by Erratum 001, 2026-08-07** - see
> `34-erratum-2026-08-07.md`. F-02 withdrawn as written and downgraded, F-04 count withdrawn, F-01 re-proven
> with corrected wording, F-11 scoped, F-08 tied to concrete failure modes, F-13 and F-14 added.
> The production **NO-GO** verdict is preserved.

- Commit: f8f12b6f4ed4b163b2d0ab8fd8fea7a5c123abe8 (branch edit/edt-1fa916ba)
- Working tree: clean (0 modified files)
- UTC start: 2026-08-07T15:57:12Z
- Environment audited: single Supabase project psfvrskpnwcshvajzeix (PRODUCTION). Read-only introspection only; no mutation performed.
- Test-environment guard: BLOCKED (aura-dc-security-test not provisioned)

## Verdicts
- Production readiness: NO-GO
- Sovereign-infrastructure POC readiness: NO-GO in current form; conditionally feasible as a clearly-labelled simulated demonstration
- Tenant isolation: **Multi-tenant isolation is not implemented for the core resource graph** (revised). 113 tables classified; 13 carry a direct tenant column; of 49 core tables only 16 resolve to a tenant path. The schema CAN express tenant ownership (organizations, profiles.org_id); the core graph does not use it.
- Authorization: IMPLEMENTED, statically hardened, runtime UNVERIFIED
- Data provenance: MIXED - core operating views are SIMULATED/MOCKED
- AI / RAG / MCP / Omniverse / DSX truthfulness: RAG STUBBED, MCP STUBBED, Omniverse and DSX DISCONNECTED (fail-closed, correctly)

## Measured baseline
| Metric | Value |
|---|---|
| Public tables | 113 (RLS enabled on 113, 0 without policies) |
| Policies | 284 |
| Views / matviews | 4 / 1 |
| DB functions | 165 (33 SECURITY DEFINER, 0 missing pinned search_path) |
| Migrations | 35 |
| Edge Functions | 157 deployed; 89 active_internal, 6 callback/webhook, 61 no in-repo caller, **0 proven orphans** (revised) |
| Frontend routes | 24 top-level route declarations, 100 path declarations repo-wide |
| Realtime tables | 1 |
| anon privileges | 1 **table** privilege (INSERT on onboarding_submissions); schema USAGE only; 0 sequence privileges; EXECUTE on 129 public functions (126 pgvector builtins, 2 non-RPC trigger fns, 1 SECURITY INVOKER) |
| Type-check | 0 errors |
| Lint | 1329 errors, 137 warnings |
| Tests | 1451 total / 1114 pass / 228 fail / 109 skip (+13/+12/+1/0 vs the 1438 immediate baseline; 3 suites collect zero tests) |
| Hermetic gates | 12 run, 11 completed with results, 1 unrunnable (no registry advisory endpoint); 6 runtime gates blocked |
| Bundle | 6.2 MB `dist/assets`; 2 chunks over the 1000 kB threshold |
| Dead code | 287 of 1051 source modules unreachable from `src/main.tsx` |

## Ten most serious findings
F-01 multi-tenant isolation absent for the core resource graph (CRITICAL), F-03 verification environment unavailable (HIGH), F-05 228 failing tests with the Phase 0 comparison UNATTRIBUTED (HIGH), F-07 simulated data in operational dashboards (HIGH), F-08 no application/queue/worker tier (HIGH, tied to durability/availability/workflow failures), F-10 single Supabase environment (HIGH), F-13 Edge Function static security posture (HIGH), F-02 implicit WITH CHECK inheritance (MEDIUM, hardening), F-04 61 functions with no in-repo caller (MEDIUM), F-06 1329 lint errors (MEDIUM), F-09 RAG stubbed (MEDIUM), F-14 three zero-collect suites (MEDIUM). Full detail in 20-findings-register.csv.

Severity counts after erratum: 1 CRITICAL, 6 HIGH, 5 MEDIUM, 2 INFORMATIONAL. Provisional readiness: 43%.

## Prior claims
- CONFIRMED (static): B-02 search_path hardening, B-03 anonymous closure, guard fails closed, test egress guard.
- DISPROVED: none of the Phase 1 claims were found overstated at the static level.
- STILL UNVERIFIED: authenticated RLS behavior, B-06 end-to-end role management, B-04 in every respect.

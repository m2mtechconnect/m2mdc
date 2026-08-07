# Production Readiness Scorecard (0-5) - PROVISIONAL

Revised 2026-08-07 by Erratum 001 (`34-erratum-2026-08-07.md`) and by Stage 2A closeout
(`43-stage-2a-static-audit-closeout.md`). This score remains **PROVISIONAL** until the runtime probes in
`42-blocked-runtime-execution-manifest.md` are executed against the `aura-dc-security-test` project.

| Domain | Score | Confidence | Blocking |
|---|---|---|---|
| Architecture | 2 | HIGH | F-08 |
| Frontend | 3 | HIGH | F-07 |
| Backend | 2 | HIGH | F-08, F-13, F-15 |
| Database | 4 | HIGH | - (F-02 MEDIUM hardening; F-17 withdrew the migration-grant failure) |
| Authentication | 3 | MEDIUM | - |
| Authorization | 2 | HIGH | F-15 (was 3; lowered - the "admin" tier performs no authorization) |
| Tenant isolation | 0 | HIGH | F-01 |
| Edge Functions | 2 | HIGH | F-13, F-15 |
| AI / RAG | 1 | HIGH | F-09 |
| Integrations | 1 | HIGH | - |
| Data provenance | 2 | HIGH | F-07 |
| Observability | 1 | MEDIUM | - |
| Reliability | 1 | MEDIUM | F-08 |
| Performance | 2 | MEDIUM | bundle budget (was LOW confidence; now measured) |
| Accessibility | 4 | MEDIUM | - |
| Testing | 2 | HIGH | F-05, F-14 |
| CI/CD | 2 | HIGH | F-16 (was MEDIUM confidence) |
| Environment separation | 1 | HIGH | F-03, F-10 |
| Documentation | 4 | HIGH | - |
| Operational readiness | 1 | HIGH | - |
| Sovereignty and governance | 2 | MEDIUM | - |

Weighted overall readiness: **42% (PROVISIONAL)**. The one-point movement from 43% reflects only the Authorization
downgrade caused by F-15; nothing in the system changed during Stage 2A.

Required to proceed to customer production: no domain below 3 and zero unresolved CRITICAL. F-01 independently
blocks production regardless of the average.

Severity counts after Stage 2A: **1 CRITICAL** (F-01), **7 HIGH** (F-03, F-05, F-07, F-08, F-10, F-13, F-15),
**5 MEDIUM** (F-02, F-06, F-09, F-14, F-16), **4 INFORMATIONAL** (F-04, F-11, F-12, F-17).

Verdict: **Production NO-GO** (unchanged).

---

## Stage 2A Addendum revision (2026-08-07)

| Item | Prior | Revised |
|---|---|---|
| Deployable Edge Functions | 157 (baseline) / 156 (classified) | **156** - `_shared/` is a library directory with no `index.ts` |
| F-15 severity | HIGH | **CRITICAL** (children F-15b `ops-heartbeat`, F-15c `zapier-webhook`) |
| F-15 affected functions | unspecified | **8** admin-level + 1 correctly authorized (`integrations-list`) |
| Anonymous privileged endpoints | implied | **0** - gateway `verify_jwt` defaults to true |
| Authenticated non-admin privileged endpoints | implied | **8** |
| F-17 | INFORMATIONAL, "106 false positives" | **MEDIUM** - 102 `platform_managed_privilege`, 4 `resolved_by_explicit_later_grant`, all `migration_nonhermetic` |
| F-14 uncollected cases | 30 | **32** (identities preserved in `48-...csv`) |
| Severity counts | 1C / 7H / 5M / 4I | **2 CRITICAL / 7 HIGH / 6 MEDIUM / 3 INFORMATIONAL** |
| Readiness | 42% PROVISIONAL | **40% PROVISIONAL** |
| Verdict | NO-GO | **NO-GO** |

Stage 2B runtime verification is **BLOCKED**; see `49-stage-2b-preflight.md`. Zero runtime requests were made.
The "Data Centre is the exclusive master template" invariant is **UNVERIFIED** - its only automated guard has
never executed.

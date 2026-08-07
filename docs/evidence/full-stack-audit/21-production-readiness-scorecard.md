# Production Readiness Scorecard (0-5) - PROVISIONAL

Revised 2026-08-07 by Erratum 001 (`34-erratum-2026-08-07.md`). This score remains **PROVISIONAL** until the
six runtime gates blocked on the `aura-dc-security-test` project are executed.

| Domain | Score | Confidence | Blocking |
|---|---|---|---|
| Architecture | 2 | HIGH | F-08 |
| Frontend | 3 | HIGH | F-07 |
| Backend | 2 | HIGH | F-08, F-13 |
| Database | 4 | HIGH | - (F-02 downgraded to MEDIUM hardening; 0 static bypasses) |
| Authentication | 3 | MEDIUM | - |
| Authorization | 3 | MEDIUM | F-03 |
| Tenant isolation | 0 | HIGH | F-01 |
| Edge Functions | 2 | HIGH | F-13 (F-04 downgraded; 0 proven orphans) |
| AI / RAG | 1 | HIGH | F-09 |
| Integrations | 1 | HIGH | - |
| Data provenance | 2 | HIGH | F-07 |
| Observability | 1 | MEDIUM | - |
| Reliability | 1 | MEDIUM | F-08 |
| Performance | 2 | LOW | - |
| Accessibility | 4 | MEDIUM | - |
| Testing | 2 | HIGH | F-05, F-14 |
| CI/CD | 2 | MEDIUM | - |
| Environment separation | 1 | HIGH | F-03, F-10 |
| Documentation | 4 | HIGH | - |
| Operational readiness | 1 | HIGH | - |
| Sovereignty and governance | 2 | MEDIUM | - |

Weighted overall readiness: **43% (PROVISIONAL, revised from 39%)**. The increase reflects only the corrected
F-02 and F-04 severities, not any change in the system.

Required to proceed to customer production: no domain below 3 and zero unresolved CRITICAL. F-01 independently
blocks production regardless of the average.

Severity counts after erratum: **1 CRITICAL (F-01)**, **6 HIGH** (F-03, F-05, F-07, F-08, F-10, F-13),
5 MEDIUM (F-02, F-04, F-06, F-09, F-14), 2 INFORMATIONAL.

Verdict: **Production NO-GO** (unchanged).

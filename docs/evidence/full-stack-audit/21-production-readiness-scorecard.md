# Production Readiness Scorecard (0-5)
| Domain | Score | Confidence | Blocking |
|---|---|---|---|
| Architecture | 2 | HIGH | F-08 |
| Frontend | 3 | HIGH | F-07 |
| Backend | 2 | HIGH | F-04, F-08 |
| Database | 3 | HIGH | F-02 |
| Authentication | 3 | MEDIUM | - |
| Authorization | 3 | MEDIUM | F-03 |
| Tenant isolation | 0 | HIGH | F-01 |
| Edge Functions | 2 | HIGH | F-04 |
| AI / RAG | 1 | HIGH | F-09 |
| Integrations | 1 | HIGH | - |
| Data provenance | 2 | HIGH | F-07 |
| Observability | 1 | MEDIUM | - |
| Reliability | 1 | MEDIUM | F-08 |
| Performance | 2 | LOW | - |
| Accessibility | 4 | MEDIUM | - |
| Testing | 2 | HIGH | F-05 |
| CI/CD | 2 | MEDIUM | - |
| Environment separation | 1 | HIGH | F-03, F-10 |
| Documentation | 4 | HIGH | - |
| Operational readiness | 1 | HIGH | - |
| Sovereignty and governance | 2 | MEDIUM | - |

Weighted overall readiness: 39%. Required to proceed to customer production: no domain below 3 and zero unresolved CRITICAL. F-01 independently blocks production regardless of the average.

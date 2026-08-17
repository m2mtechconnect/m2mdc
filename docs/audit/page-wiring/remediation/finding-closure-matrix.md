# Finding closure matrix - final published build

| ID | Finding | Severity | Status | Evidence |
| --- | --- | --- | --- | --- |
| PW-P1-01 | Simulation step state not preserved in URL | P1 | Closed | simulation-workflow.md, `?step=` deep links hold |
| PW-P1-02 | Run gating gave no explanation | P1 | Closed | RunBlockedExplanation rendered, 103 scoped tests |
| PW-P1-03 | No run export from Compare/Review | P1 | Closed | CSV + JSON samples bound to SIM-2026-08-17-001 |
| PW-P1-04 | Auth profile fetch loop | P1 | Closed | auth-and-data-evidence.md |
| PW-P2-01 | `/login` and `/onboarding` dead for signed-in users | P2 | Closed | authenticated sweep, both redirect to `/dashboard` |
| PW-P2-02 | `/deploy` dead route | P2 | Closed | deliberate explanation rendered |
| PW-P2-03 | `/connect/monitor` perpetual spinner | P2 | Closed | truthful terminal state |
| PW-P2-04 | Duplicate `/integrations` navigation entry | P2 | Closed | single alias resolution |
| PW-P3-01 | Aborted `/auth/v1/user` on `/omniverse-scene` | P3 | Closed | 0 session requests observed |
| PW-P3-02 | Missing `/landing/hero-datacenter.mp4` | P3 | Closed | HTTP 200, video/mp4, 33,555,160 bytes |
| PW-P3-03 | Missing `/grid-pattern.svg` (found during this pass) | P3 | Closed | HTTP 200, image/svg+xml |

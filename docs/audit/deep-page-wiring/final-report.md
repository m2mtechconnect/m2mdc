# Final report - AURA deep page-wiring audit

Build bmswht9e1 | bundle index-C6g0i7CT.js | manifest v7 | deployed 2026-08-17T00:56Z | host https://auradc.m2mtechconnect.com

## Counts
- Router path declarations extracted from source: 94 (plus 24 aliases and 2 parameterised aliases)
- Dynamic route patterns: 13
- Menu destinations: 15
- Routes exercised at runtime: 83 authenticated, 83 anonymous
- Pages and subpages inventoried: 83
- Tabs inventoried: 41 across 9 tabbed surfaces
- Interactive controls inventoried: 803 buttons, 197 links, 26 inputs over 16 primary pages
- Workflow chains assessed: 9 (1 limited, 1 demo, 1 read-only, 1 not wired, 5 unverified)
- Routes tested per role: 1 role only (internal admin-capable session) plus anonymous
- Reads traced to a real data source: 7 documented in data-contract-matrix.csv
- Mutations tested: 0
- Audit-created records: 0, nothing to clean up
- Pages with static or demo data: 2 (`/connect/monitor`, Evidence workspaces in SIMULATED mode, both labelled)
- Permanent loading states: 2
- Authorization defects: 0 observed
- Tenant isolation defects: not testable
- Data integrity defects: 1
- Console/network defects: 4 unexplained plus expected navigation aborts
- Accessibility blockers: 1 confirmed, 1 unconfirmed
- P0 0 | P1 1 | P2 2 | P3 6

## Per-menu verdict
| Menu item | Verdict |
| --- | --- |
| Dashboard | WIRED_READ_ONLY |
| Blueprint | WIRED_READ_ONLY |
| Simulation | WIRED_WITH_LIMITATIONS |
| Evidence | WIRED_WITH_LIMITATIONS |
| Facilities | BLOCKED_UNVERIFIED |
| Integrations | WIRED_WITH_LIMITATIONS |
| Build twin | BLOCKED_UNVERIFIED |
| Subsystem agents | WIRED_READ_ONLY |
| Telemetry and analytics | WIRED_READ_ONLY |
| Deployments | WIRED_READ_ONLY |
| AI settings | BLOCKED_UNVERIFIED |
| Admin console | WIRED_READ_ONLY |
| Learning Hub | WIRED_READ_ONLY |
| Search | WIRED_WITH_LIMITATIONS |
| Sign Out | BLOCKED_UNVERIFIED |

Per-subpage verdicts: `deep-link-refresh-matrix.csv` and `page-and-subpage-inventory.csv`.

## Verdict
AURA_DEEP_PAGE_WIRING_AUDIT_PARTIAL

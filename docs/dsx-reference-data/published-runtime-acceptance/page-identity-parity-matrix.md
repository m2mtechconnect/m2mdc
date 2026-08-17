# Phase 1 - page identity and parity matrix

## Finding

The pre-existing canary was a **generic surface substitution** on all 19
REFERENCE_DATA_CONSUMER routes. `ReferenceRouteGate` unmounted the canonical
page component and rendered a single `ReferenceSurface` whose only variation
was a section list. Every route shared: one header, one title source, one
reference-configuration button row, no tabs, no page-specific controls, no
statement of removed workflow, and one export filename
(`aura-reference-export.csv`). Verdict for all 19 routes before remediation:
`GENERIC_SURFACE_SUBSTITUTION`.

## Remediation performed

`src/data/dataset/referenceAdapters.ts` introduces one typed adapter per
consumer route, declaring page id, product page title, navigation group, user
job, tab structure with per-tab intent, whether the configuration selector is
meaningful, a per-page export identity, assistant scope, and the explicit list
of interactions unavailable in reference mode with the reason for each.
`ReferenceSurface` now renders adapter-driven page chrome (title, group badge,
tablist, per-tab intent, limitations card) and section rendering is scoped to
the active tab. Data still flows only through the centralized selectors.

Unit-enforced in `src/data/dataset/__tests__/pageIdentity.test.ts`: unique page
ids, unique titles, unique tab/section shapes, unique export stems, every tab
declares intent and sections, every declared section is registered in the
surface registry, and every removed interaction carries a reason clause.

## Matrix

| Route | Page | Nav group | Tabs | Config selector | Export stem | Verdict after |
| --- | --- | --- | --- | --- | --- | --- |
| /dashboard | AI Factory Overview | overview | Status, Key values, Data availability | yes | aura-overview | READ_ONLY_BY_DESIGN |
| /manage/facilities | Facilities | design | Reference facilities, AURA-derived | no | aura-facilities | READ_ONLY_BY_DESIGN |
| /blueprint/:id | Facility Blueprint | design | Model, Specifications, Derive, Versions | yes | aura-blueprint | FUNCTIONALLY_MIGRATED |
| /blueprint/preview | Blueprint Preview | design | Resolved values | yes | aura-blueprint-preview | READ_ONLY_BY_DESIGN |
| /data-centre-twin/:id/blueprint | Twin Blueprint | design | Model, Derive | yes | aura-twin-blueprint | FUNCTIONALLY_MIGRATED |
| /builder | Build Twin | design | Choose source, Derive design | yes | aura-build-twin | FUNCTIONALLY_MIGRATED |
| /simulation | Simulation Studio | simulate | Configure, Simulate, Compare, Review, Evidence | yes | aura-simulation | FUNCTIONALLY_MIGRATED |
| /simulation/preview | Simulation Preview | simulate | Scenarios, Prospective lineage | yes | aura-simulation-preview | READ_ONLY_BY_DESIGN |
| /analytics | Telemetry & Analytics | operate | History, Published values | yes | aura-analytics | UNAVAILABLE_WITH_REASON |
| /search | Search | overview | Results, Ask | no | aura-search | FUNCTIONALLY_MIGRATED |
| /compliance | Validation & Evidence | govern | Records, Export | no | aura-evidence | FUNCTIONALLY_MIGRATED |
| /app/agents | Subsystem Agents | operate | Definitions, Availability | no | aura-agents | READ_ONLY_BY_DESIGN |
| /connect/monitor | Ingestion Monitor | operate | Sources, Blockers | no | aura-ingestion | UNAVAILABLE_WITH_REASON |
| /connect/health | Source Health | operate | Health, Blockers | no | aura-source-health | UNAVAILABLE_WITH_REASON |
| /manage/integrations | Integrations | operate | Sources | no | aura-integrations | READ_ONLY_BY_DESIGN |
| /deploy | Deployment Lanes | govern | Eligibility | no | aura-deployment-lanes | UNAVAILABLE_WITH_REASON |
| /deployments | Deployment History | govern | History | no | aura-deployment-history | READ_ONLY_BY_DESIGN |
| /admin/asset-pipeline | Asset Pipeline | govern | Assets, Blockers | no | aura-asset-pipeline | READ_ONLY_BY_DESIGN |
| /help | Support & Documentation | support | Glossary, Known limits | no | aura-glossary | READ_ONLY_BY_DESIGN |

No route retains `GENERIC_SURFACE_SUBSTITUTION` under the structural
definition tested above. Screenshot evidence per route and per breakpoint was
NOT captured in this phase; page identity is currently proven structurally, not
visually. This keeps the overall verdict PARTIAL.

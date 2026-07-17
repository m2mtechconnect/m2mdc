# Random & Synthetic Data Register (Phase 1A.3)

Supersedes `random-data-register.md`. Adds file:line, consumer route,
user-visible effect, classification, and remediation owner/phase for every
`Math.random()` / synthetic-noise / setInterval-driven mutation reachable
from a live route. Non-`src/` occurrences and `__tests__/` sites are
intentionally excluded.

Classifications carry the same meanings as in `random-data-register.md`:
**operational** | **simulation** | **demo-fixture** | **harmless-animation**
| **test-only** | **dead-code**.

Owner column: `1A.2 done` = already routed through `demoMetric`/`simulated`;
`1A.3.b` / `1A.3.c` = must be wrapped at consumer boundary in the named
sub-slice; `1B` = deferred to real-data-wiring phase; `keep` = intentional
non-operational noise.

## Reachable from active routes

| File:line | Symbol / expression | Consumer route(s) | User-visible effect | Class | Provenance today | Owner |
|---|---|---|---|---|---|---|
| `src/pages/IntelligenceDashboard.tsx:203-205` | `roi`, `accuracy`, `total_runs` fallback | `/analytics`, `/operations`, `/intelligence` | KPI tile values when Supabase RPC missing | demo-fixture | `demo` (via `demoMetric` per 1A.2) | 1A.2 done — verify in 1A.3.c |
| `src/pages/InfrastructurePage.tsx:238` | telemetry `setInterval` mutation | `/infrastructure` | Live-mutating rack tiles | demo-fixture | untagged | **excluded** (page slated for removal) |
| `src/pages/InfrastructurePage.tsx:258` | `setTimeout` scroll | `/infrastructure` | Scroll behaviour only | harmless-animation | n/a | keep |
| `src/twins/sovereignDataCenter/simulationEngine.ts:268` | run id suffix | Sim panels S1-S6 | Internal id; not a metric | harmless-animation | n/a | keep |
| `src/twins/sovereignDataCenter/simulationEngine.ts:276` | `durationMs` demo latency | Sim panels S1-S6 | Perceived run duration | simulation | untagged | 1A.3.b — surface as `simulated` |
| `src/twins/sovereignDataCenter/mockData.ts:462` | temp noise ±5°C | D1 Thermal, D3 Cooling | Rack/aisle temperature | demo-fixture | untagged at consumer | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:484` | PUE noise ±0.25 | D2 Power, D8 Carbon | PUE reading | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:504` | ΔT noise ±1°C | D1, D3 | Cooling ΔT | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:524-528` | rack power + spike | D2, D5, D6 | Rack kW draw + spikes | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:556` | facility power noise | D2, D5 | Facility total kW | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:587-600` | network event stream | D4 Network, event timeline | Event log entries | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:667-675` | GPU/CPU/mem/ECC/throttle | D6 Workload | Workload KPI tiles | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:710-728` | UPS / grid mix / carbon | D2, D8 | UPS charge, energy mix | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:766-778` | chiller cycle + aisle temps | D1, D3 | Chiller/CRAC readings | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:807-822` | data-flow + sovereignty pct | D4, D7 | Data flow, sovereignty score | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:857-863` | carbon KPI stream | D8 Carbon | gCO2e, PUE24h, DCiE, credits | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/mockData.ts:946-951` | incident stream | D4, D7 | Incident timeline | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts:631` | tick interval | Sim panels S1-S6 (enhanced mode) | Streaming updates | simulation | untagged | 1A.3.b — surface as `simulated` |
| `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts:716` | event id suffix | Sim event log | Internal id | harmless-animation | n/a | keep |
| `src/twins/dataCenter/simulationEngine.ts:208` | run id suffix | Sim panels | Internal id | harmless-animation | n/a | keep |
| `src/twins/dataCenter/mockData.ts:66-78` | `randomInRange`, `pickRandom`, `withNoise` helpers | D1-D9 fallback via `DataCentreDashboard` | Any metric using helpers | demo-fixture | untagged | 1A.3.c — wrap consumers |
| `src/twins/dataCenter/mockData.ts:117-145` | GPU server profile + throttling | D6 fallback | GPU-server presence, throttle bool | demo-fixture | untagged | 1A.3.c |
| `src/twins/dataCenter/mockData.ts:245` | rack status warning threshold | Rack overview | Rack warning badge | demo-fixture | untagged | 1A.3.c |
| `src/twins/dataCenter/mockData.ts:372` | cooling status threshold | D3 | Cooling warning badge | demo-fixture | untagged | 1A.3.c |
| `src/twins/sovereignDataCenter/hooks/useSovereignDCTwin.ts:102` | `setTimeout 1500` | All D1-D9 | Loading spinner duration | harmless-animation | n/a | keep |
| `src/twins/sovereignDataCenter/components/SovereignDCDeploymentSteps.tsx:114-141` | deployment step timers | Deployment flow | Simulated deploy timing | demo-fixture | untagged | 1B — non-KPI, defer |

## Explicitly kept (documented non-operational)

- `src/components/data-centre-twin/overview/SparklineChart.tsx` — cosmetic
  sparkline jitter.
- `src/components/workflow/WorkflowEditor.tsx` — node id generator.
- `src/components/UploadZone.tsx` — upload id generator.
- `src/components/auth/BackgroundGrid.tsx` — background animation.
- `src/components/ui/sidebar.tsx` — component id fallback.
- `src/components/search/RecommendationsPanel.tsx` — non-DC ranking noise.
- `src/components/builder/steps/Step5Deploy.tsx` — builder preview only.

## Excluded from Phase 1A.3 (with rationale)

- `src/pages/InfrastructurePage.tsx` — slated for removal or replacement in
  Phase 1B; retrofitting perpetuates a page the roadmap intends to delete.
- `src/pages/Pilot.tsx`, `src/pages/Playbook.tsx` — no operational KPI
  tiles; the values that exist are configured targets and are already
  presented as targets.
- `src/components/aoc/*`, `src/components/marketplace/TemplateSimulation.tsx`,
  `src/data/industryAccurateDefaults.ts` — out of DC operational scope.
- `src/components/builder/step5/*Simulation*.ts` — Builder design-time
  preview; not an operational dashboard.

## Verification

Sweep command used:

```
rg -n "Math\.random\(|setInterval\(|setTimeout\(" \
   src/components/data-centre-twin/ src/components/simulation/ \
   src/twins/ src/pages/IntelligenceDashboard.tsx \
   src/pages/InfrastructurePage.tsx
```

No `Math.random()` occurrences were found inside
`src/twins/dataCenter/omniverseAdapter.ts` (asserted at L26 and by the
adapter characterization tests). The Kit runtime path remains deterministic.

`random-data-register.md` (Phase 1A.1) remains for historical continuity but
is superseded by this file for Phase 1A.3 planning purposes.
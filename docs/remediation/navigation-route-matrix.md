# AURA DC Navigation Route Matrix

This matrix captures the authenticated internal shell routes and the repaired click surfaces used to reach them.

| Surface | Click label | Route | Source | Status |
| --- | --- | --- | --- | --- |
| Desktop header | Engineering Workbench / Command | `/` | Role navigation | Active |
| Desktop header | Build Data Centre Twin | `/builder` | Role navigation | Active |
| Desktop header | Subsystem Agents | `/app/agents` | Role navigation | Active |
| Desktop header | Telemetry & Analytics | `/intelligence` | Role navigation | Active |
| Desktop header | Simulation | `/data-centre-twin?view=simulation` | Role navigation | Active |
| Desktop header | Sovereignty & Safety Audit | `/compliance` | Role navigation | Active |
| Desktop header | Teams | `/teams` | Role navigation | Active |
| Desktop header | Infrastructure | `/infrastructure` | Role navigation | Active |
| Desktop submenu | More > Telemetry & Analytics | `/intelligence` | Role navigation | Active below xl |
| Desktop submenu | More > Simulation | `/data-centre-twin?view=simulation` | Role navigation | Active below xl |
| Mobile drawer | Build Data Centre Twin | `/builder` | Role navigation | Active |
| Dashboard KPI cards | Global PUE / GPU / Thermal / Sovereignty | `/data-centre-twin` or active twin path | Dashboard links | Active |
| Dashboard quick link | Open DC Twin Dashboard | `/data-centre-twin` or active twin path | Dashboard card | Active |
| Dashboard quick action | View Blueprint | `/blueprint/default` or active twin blueprint | Dashboard action | Active |
| Dashboard quick action | Run Simulation | `/data-centre-twin/default?view=simulation&demo=true` or active twin simulation | Dashboard action | Active |
| Account menu | Profile | `/account/profile` | User menu | Active |
| Account menu | Settings | `/account/settings` | User menu | Active |
| Command palette | Telemetry & Analytics Dashboard | `/intelligence` | Search result | Active |
| Command palette | Sovereignty & Safety Audit | `/compliance` | Search result | Active |
| Command palette | Prometheus Integration | `/connect/monitor` | Search result | Repaired from dead `/connect` |
| Command palette | GPU Scheduler Agent Config | `/app/agents` | Search result | Repaired from dead `/manage-agents` |

Internal routes present but not primary navigation entries remain reachable by direct URL or contextual links: account access control, admin onboarding submissions, admin user approvals, deployment history, marketplace, connect health, universal search, AI settings, playbook, twin debug, Omniverse scene, blueprint preview, simulation preview, and dev-only overlay fixtures.
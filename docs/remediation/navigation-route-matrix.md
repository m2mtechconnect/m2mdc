# AURA DC Navigation Route Matrix

This matrix captures the authenticated internal shell routes and the repaired click surfaces used to reach them.

| Surface | Click label | Route | Source | Status |
| --- | --- | --- | --- | --- |
| Desktop header | Engineering Workbench / Command | `/` | Role navigation | Active |
| Desktop header | Build Data Centre Twin | `/builder` | Role navigation | Active |
| Desktop header | Subsystem Agents | `/app/agents` | Role navigation | Active |
| Desktop header | Telemetry & Analytics | `/intelligence` | Role navigation | Active at 2xl and wider |
| Desktop header | Simulation | `/data-centre-twin?view=simulation` | Role navigation | Active at 2xl and wider |
| Desktop header | Sovereignty & Safety Audit | `/compliance` | Role navigation | Active at 2xl and wider |
| Desktop header | Teams | `/teams` | Role navigation | Active at 2xl and wider |
| Desktop header | Infrastructure | `/infrastructure` | Role navigation | Active at 2xl and wider |
| Desktop submenu | More > Telemetry & Analytics | `/intelligence` | Role navigation | Active below 2xl |
| Desktop submenu | More > Simulation | `/data-centre-twin?view=simulation` | Role navigation | Active below 2xl |
| Desktop submenu | More > Teams | `/teams` | Role navigation | Active below 2xl |
| Desktop submenu | More > Infrastructure | `/infrastructure` | Role navigation | Active below 2xl |
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

## Full authenticated-shell route inventory (source: `src/AuthenticatedShell.tsx`)

Every route registered under the authenticated shell, with the deep-link
coverage status enforced by `tests/truth-in-ui/navigation-full-surface.spec.ts`.

| Route | Component | Deep-link click evidence | Notes |
| --- | --- | --- | --- |
| `/` | Dashboard | Covered | Landing for internal users |
| `/dashboard` | Dashboard | Covered | Alias |
| `/builder` | Builder | Covered | Primary nav |
| `/deploy` | Deploy | Covered | Deep-link only |
| `/deployments` | DeploymentHistory | Covered | Deep-link only |
| `/agent/:id` | AgentWorkspace | Deferred | Requires seed data |
| `/agents/:id/chat` | AgentChat | Deferred | Requires seed data |
| `/agent-chat` | AgentChat | Covered | Deep-link only |
| `/analytics` | IntelligenceDashboard | Covered | Alias |
| `/operations` | IntelligenceDashboard | Covered | Alias |
| `/intelligence` | IntelligenceDashboard | Covered | Primary nav (via More below 2xl) |
| `/account/profile` | Profile | Covered | User menu |
| `/account/settings` | Settings | Covered | User menu |
| `/account/access-control` | AccessControl | Covered | Admin only |
| `/admin/onboarding-submissions` | OnboardingSubmissions | Covered | Admin only |
| `/admin/user-approvals` | AdminUserApproval | Covered | Admin only |
| `/admin/signups-dashboard` | AdminSignupsDashboard | Covered | Admin only |
| `/integrations` | Redirect -> `/marketplace?tab=integrations` | Covered by matrix | |
| `/marketplace` | Marketplace | Covered | |
| `/marketplace/integrations` | Marketplace | Covered | |
| `/compliance` | Compliance | Covered | Primary nav |
| `/teams` | Teams | Covered | Primary nav (via More below 2xl) |
| `/app/agents` | ManageAgents | Covered | Primary nav |
| `/agents` | Redirect -> `/app/agents` | Covered by matrix | |
| `/subsystem-agents` | Redirect -> `/app/agents` | Covered by matrix | |
| `/app/agents/:slug/detail` | AgentDetail | Deferred | Dynamic |
| `/app/agents/:agentId/manage` | TwinManage | Deferred | Dynamic |
| `/app/agents/:agentId/operations` | AgentOperationsRedirect | Deferred | Dynamic |
| `/twins/:instanceId/manage` | TwinManageRedirect | Deferred | Dynamic |
| `/studio/systems/:systemId/manage` | SystemManage | Deferred | Dynamic |
| `/data-centre-twin` | DataCentreTwin | Covered | Primary nav (via More below 2xl) |
| `/data-centre-twin/:id` | DataCentreTwin | Covered (default id) | |
| `/data-centre-twin/:id/blueprint` | Blueprint | Deferred | Dynamic |
| `/blueprint/:id` | Blueprint | Covered (default id) | |
| `/blueprint/preview` | BlueprintPreview | Covered | |
| `/simulation/preview` | SimulationPreview | Covered | |
| `/help` | Help | Covered | Header link |
| `/connect/monitor` | ConnectMonitor | Covered | Command palette |
| `/connect/health` | ConnectHealth | Covered | Deep-link only |
| `/search` | Search | Covered | Deep-link only |
| `/universal-search` | UniversalSearch | Covered | Deep-link only |
| `/settings/ai` | AISettings | Covered | Deep-link only |
| `/playbook` | Playbook | Covered | Deep-link only |
| `/data-centre-twin?view=simulation` | DataCentreTwin | Covered | Primary nav (via More below 2xl) |
| `/omniverse-scene` | OmniverseScene | Covered | Deep-link only |
| `/twin-datacentre` | DataCentreTwinLanding | Covered | Deep-link only |
| `/twin-debug` | TwinDebug | Covered | Deep-link only |
| `/infrastructure` | InfrastructurePage | Covered | Primary nav (via More below 2xl) |
| `/digital-twins-demo/funding-intake` | FundingIntakeDemo | Covered | Deep-link only |
| `/sign-out` | SignOut | Covered by user-menu-signout spec | |
| `*` | NotFound | Covered by axe-a11y-authed spec | |

**Coverage gap register (must be revisited before a FULL VERIFIED verdict):**

- Every `:id`, `:slug`, `:agentId`, `:instanceId`, `:systemId` dynamic route above requires a seeded fixture before it can be real-click verified.
- The role-conditioned navigation manifest is asserted at the *destination* level in `navigation-full-surface.spec.ts`, but the *visibility gate* per role (executive vs engineer vs security_admin) is not yet enumerated with a browser fixture — the `installSupabaseMock` helper only mints a single admin identity today.
- Production-build preview (`vite build && vite preview`) has not been exercised by the real-click suite in the current session; local dev-server coverage only.
- Shared preview URL (`id-preview--*.lovable.app`) and published `.lovable.app` deployment have not been re-verified in this session — the frontend must be re-published through the sanctioned workflow after these edits before those surfaces can be trusted.
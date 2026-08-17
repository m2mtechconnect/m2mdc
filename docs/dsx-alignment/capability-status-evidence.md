# Capability status evidence (published build assets/index-BLh1dE2h.js)

Source of truth: `src/config/dsxCapabilityRegistry.ts`. Registry evidence violations: 0.

## Totals by status

| Status | Count |
|---|---|
| AURA_NATIVE | 7 |
| DSX_ALIGNED | 5 |
| NVIDIA_INTEGRATED | 0 |
| SIMREADY_VALIDATED | 0 |
| PLANNED | 2 |
| BLOCKED | 0 |
| UNAVAILABLE | 2 |

NVIDIA_INTEGRATED: 0. SIMREADY_VALIDATED: 0. No status was promoted in this pass.

## Inventory

| ID | Name | Route | DSX area | Status | Evidence | Data source | Last validated | NVIDIA code invoked | OpenUSD canonical | SimReady validated | AURA runtime | Limitations | Blockers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aif-overview | AI Factory Overview | /dashboard | AIF-DT application layer | DSX_ALIGNED | src/workspace/dashboard | AURA blueprint model and durable simulation runs | 2026-08-17 | False | False | False | True | Efficiency indicators are simulated or estimated, never measured facility data.; No Max-Q implementation is connected; Max-Q language must not be used. | - |
| facility-blueprint | Facility Blueprint | /blueprint | PLM/CAD/BIM assembly | DSX_ALIGNED | src/stores/blueprintStore.ts | AURA blueprint store, canonical OpenUSD masters under assets/ | 2026-08-17 | False | True | False | True | Facility assemblies are not SimReady validated.; USD authoring round-trip from the browser is not implemented. | - |
| openusd-asset-pipeline | OpenUSD Asset Pipeline | /builder | USD storage | DSX_ALIGNED | scripts/asset-ingestion/, docs/evidence/nvidia-pack/ | Asset manifests, ingestion records, approval and publication records | 2026-08-17 | False | True | False | True | Geometry is NVIDIA-derived OpenUSD; electrical, thermal and connection-point metadata are not validated.; GLB derivatives are delivery artefacts only and never replace the OpenUSD master. | - |
| simready-validation | SimReady asset validation | /admin/asset-pipeline | USD storage | UNAVAILABLE | None | No SimReady validation record exists | None | False | True | False | True | No asset carries validated electrical, thermal/cooling and connection-point metadata. | SimReady validation tooling and metadata schema are not implemented. |
| simulation-studio | Simulation Studio | /simulation | Simulation layer | AURA_NATIVE | src/workspace/scenarioEngine.ts, src/workspace/runPersistence.ts | Deterministic AURA solvers, durable server-side simulation runs | 2026-08-17 | False | False | False | True | Models are uncalibrated. Results are simulated, never measured.; NVIDIA DSX Sim is not invoked; no CFD or PhysicsX solver is reachable. | - |
| validation-evidence | Validation & Evidence | /dsx/evidence-beta/overview | Data lake | AURA_NATIVE | src/dsx/, src/workspace/runPersistence.ts | Durable simulation run records and asset validation records | 2026-08-17 | False | False | False | True | Evidence covers simulated runs and asset records only. | - |
| facilities | Facilities | /manage/facilities | AI-factory site definition | AURA_NATIVE | src/pages/manage/Facilities.tsx | AURA facility records in the backend database | 2026-08-17 | False | False | False | True | Capacity figures are modelled. Commissioned and live capacity are not instrumented. | - |
| integrations | Integrations | /manage/integrations | DSX Exchange integration boundary | DSX_ALIGNED | src/pages/Integrations.tsx | Connector configuration records | 2026-08-17 | False | False | False | True | No DSX Exchange distribution is deployed; the boundary is aligned, not connected.; Sample values are never presented as connected telemetry. | Official DSX Exchange distribution is not available to this project. |
| operations-telemetry | Operations & Telemetry | /analytics | Simulation Data Delegate | DSX_ALIGNED | src/dsx/adapters/ | Simulated and replayed datasets. No live facility source is connected. | 2026-08-17 | False | False | False | True | Live telemetry sources: 0. Every value is simulated or estimated.; Live, delayed, stale, simulated, estimated, not-connected and error states stay separate. | No facility telemetry source has been connected or verified. |
| agents-optimization | Agents & Optimization | /app/agents | AI Agent | AURA_NATIVE | src/pages/ManageAgents.tsx | AURA agent definitions and deterministic analytics | 2026-08-17 | False | False | False | True | Agents are AURA deterministic automation and analytical services.; No NVIDIA NIM runtime is invoked.; No agent performs closed-loop control of physical infrastructure. | - |
| runtime-environments | Runtime Environments | /deployments | Runtime and execution environment | AURA_NATIVE | src/pages/DeploymentHistory.tsx | Deployment records and published build fingerprints | 2026-08-17 | False | False | False | True | The browser renderer is the AURA Web Runtime. It is not Omniverse Kit and not RTX streaming. | - |
| brev-gpu-lane | Brev GPU validation lane | /deployments | Runtime and execution environment | PLANNED | docs/evidence/cloud-gpu/brev/phase-1-preflight.json | Preflight record only. No Brev instance has been provisioned. | 2026-08-17 | False | False | False | False | Preflight only. No GPU validation run has executed. | Brev credentials and a provisioned GPU instance are required. |
| aws-production-lane | AWS production and GPU lane | /deployments | Runtime and execution environment | PLANNED | infra/aws/publication-architecture.md | Architecture document only. No AWS resource is provisioned. | None | False | False | False | False | Design only. | AWS account, deployment pipeline and GPU capacity are not provisioned. |
| agent-configuration | Agent Configuration | /settings/ai | Not a DSX component | AURA_NATIVE | src/pages/AISettings.tsx | AURA provider and policy configuration | 2026-08-17 | False | False | False | True | Generic provider settings are not part of NVIDIA DSX. | - |
| search | Search | /search | Not a DSX component | AURA_NATIVE | src/pages/Search.tsx | Authorized AURA records | 2026-08-17 | False | False | False | True | A product utility. Not a DSX component. | - |
| omniverse-kit-session | Omniverse Kit / RTX streaming session | /deployments | Runtime and execution environment | UNAVAILABLE | None | No Kit instance is reachable | None | False | False | False | False | AURA renders through its own WebGL runtime. | No Omniverse Kit instance, entitlement or GPU runner is available. |

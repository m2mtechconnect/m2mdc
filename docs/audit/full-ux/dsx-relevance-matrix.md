# Phase 3 - DSX relevance matrix (recommendation only, nothing renamed or removed)

| Page | Primary user | Job | Lifecycle stage | Classification |
| --- | --- | --- | --- | --- |
| Dashboard | Executive/Operator | Facility posture | Operate | CORE_PRIMARY_PAGE |
| Blueprint | Designer | Model the facility | Design | CORE_PRIMARY_PAGE |
| Simulation | Simulation engineer | Run and compare scenarios | Validate | CORE_PRIMARY_PAGE |
| Evidence (dsx/evidence-beta) | Governance | Trace claims | Validate/Govern | CORE_PRIMARY_PAGE |
| Facilities | Admin/Designer | Select facility | Design | CORE_PRIMARY_PAGE |
| Integrations | Admin | Connectivity posture | Operate | ADMIN_ONLY |
| Build Twin (/builder) | Designer | Derive twin | Design | CONTEXTUAL_WORKFLOW_STEP (overlaps Blueprint) |
| Subsystem Agents | Engineer | Configure agents | Operate | CORE_PRIMARY_PAGE |
| Telemetry and Analytics | Operator | Trend review | Operate | CORE_PRIMARY_PAGE (charts are point-in-time reference - see data honesty) |
| Deployments | Admin | Track rollout | Deploy | SUPPORTING_REFERENCE |
| AI Settings | Admin | Model configuration | Operate | ADMIN_ONLY |
| Admin console + dataset registry + asset pipeline + validation harness | Admin | Governance of data/assets | Govern | ADMIN_ONLY |
| Search | All | Find records | Cross-cutting | SUPPORTING_REFERENCE |
| /deploy | - | Toasts and redirects to /builder | - | REMOVE_OR_CONSOLIDATE_CANDIDATE |
| /agent-chat vs /agents/:id/chat | Engineer | Agent conversation | Operate | DUPLICATIVE |
| /admin/user-approvals vs /admin/signups-dashboard vs /teams "User Approvals" tab | Admin | Approve users | Govern | DUPLICATIVE (3 surfaces, one job) |
| /twin-datacentre, /data-centre-twin, /omniverse-scene | Operator | 3D inspection | Operate | DUPLICATIVE/MISPLACED (three entry names for one experience; "omniverse-scene" risks an unsupported NVIDIA claim) |
| /pilot/* | Restricted user | Limited overview | Operate | SUPPORTING_REFERENCE |
| /dev-overlays | - | dev only | - | not in published bundle |

# ADR: Hybrid AURA control plane + NVIDIA GPU runtime

- Status: Accepted (architecture only; no NVIDIA runtime is deployed at this commit)
- Date: 2026-08-18
- Commit: `94f0d73bb24345be45898a2d08ef486a67fe6d15`
- Supersedes nothing; complements `docs/adr/0007-simulation-provider-boundary.md`

## Context

AURA today is a browser application plus Supabase backend that renders GLB
derivatives with WebGL2. There is no Omniverse Kit session, no NVCF account, no
solver service and no SimReady-validated asset in the repository (see
`docs/remediation/hybrid-nvidia-runtime/00-current-baseline.md`). Several modules
nonetheless carry NVIDIA-adjacent naming. This ADR fixes the responsibility split
so that naming, labels and evidence gates cannot drift again.

## Decision

### Responsibility split

| Concern | Owner | Notes |
|---|---|---|
| Identity, tenancy, RLS, workflows, persistence, decisions, evidence, telemetry normalization, connections, administration | AURA control plane (React + Supabase) | Durable system of record |
| Authoritative 3D geometry | OpenUSD masters in `assets/**` | Single master per asset |
| Broad low-cost visualization | GLB derivatives rendered in-browser | Always labelled **browser-preview** |
| High-fidelity visualization | Omniverse Kit / RTX pixel stream | Not present; `unavailable` until proven |
| Production streaming target | **NVCF** (preferred) | Self-managed AWS/EKS only under a separate ADR |
| Kit development, GPU/asset validation, solver testing, pilots and demos | NVIDIA Brev | Never the production control plane or system of record |
| Physics / solver execution | Isolated provider adapters | `external-solver` or `nvidia-solver` execution class |
| Messaging | **AURA MQTT** | DSX Exchange is a different product; do not rename |

### Execution taxonomy (authoritative)

`aura-deterministic`, `aura-stochastic-seeded`, `fixture-preview`,
`external-solver`, `nvidia-solver`, `measured-live`, `unavailable`.
Every runtime result must carry exactly one of these plus persisted provenance.

### Renderer modes (authoritative)

`browser-preview`, `kit-stream-nvcf`, `kit-stream-self-managed`, `unavailable`.
Falling back from a Kit mode to `browser-preview` must change the visible label.

### Deployment decision matrix

| Criterion | NVCF | Self-managed AWS/EKS | Brev | Browser-only GLB |
|---|---|---|---|---|
| Security surface | NVIDIA-managed; secrets stay in AURA session broker | Full cluster surface owned by us | Dev accounts, shared tenancy | Smallest; no GPU credentials |
| Data sovereignty | Region set by NVCF availability | Fully controllable (region, VPC, residency) | Not suitable for regulated data | Data never leaves AURA |
| GPU availability | On demand, no capacity planning | Requires reserved GPU node groups | On demand, per-instance | None required |
| Operational burden | Low | High (Helm, autoscaling, TLS, lifecycle, upgrades) | Low but manual | Lowest |
| Cost profile | Per-session, elastic | Fixed GPU node cost + idle waste | Hourly dev cost | Negligible |
| Scaling | NVIDIA-managed session scaling | Manual HPA/node-group tuning | Single instance | Client-side |
| Lifecycle management | Managed application versions | We own image build + rollout | Manual | Vite build |
| Evidence requirements | Session ID, readiness, health, termination logs | All of NVCF's plus cluster/probe/TLS evidence | Instance ID + validation logs only | GLB checksum lineage |
| Verdict | **Chosen production pilot path** | Deferred; needs its own ADR justifying sovereignty need | Dev/validation only | Retained as permanent fallback |

**We will not implement NVCF and self-managed Kubernetes simultaneously.** NVCF is
the single production pilot path unless a documented residency or sovereignty
requirement forces otherwise, in which case a separate ADR is required first.

## Truth gates

A capability may only be labelled as delivered when the repository holds evidence
that it ran: session IDs and logs for Kit streaming, validator output and checksums
for SimReady assets, solver job IDs for solver results, and external identifiers plus
health checks for deployments. Registries, filenames, database rows and mocked tests
are explicitly **not** evidence.

## NVIDIA sources consulted

All accessed 2026-08-18. No NVIDIA code, schema, content pack or asset has been
copied into this repository; no upstream commit is pinned yet (blocker B-8).

- https://docs.omniverse.nvidia.com/dsx/latest/platform-components.html
- https://docs.omniverse.nvidia.com/dsx/latest/system-architecture.html
- https://docs.omniverse.nvidia.com/dsx/latest/application-streaming.html
- https://docs.omniverse.nvidia.com/dsx/latest/simready-assets.html
- https://docs.omniverse.nvidia.com/ovas/latest/index.html
- https://docs.omniverse.nvidia.com/ovas/latest/configuration/streaming-authorization.html
- https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories
- https://github.com/dsx-ai-factory/dsx-exchange
- https://docs.nvidia.com/brev/concepts/gpu-instances

## Consequences

- `src/renderer/rendererModes.ts` must be re-keyed to the four mandated modes (Phase 2/8).
- `src/simulation/providers/omniverseProvider.ts` must stop advertising the
  non-taxonomy class `nvidia-dsx-sim` and stay `unavailable`.
- A `SimulationOrchestrator` becomes the only runtime dispatch path (Phase 2).
- The MQTT bridge keeps the name "AURA MQTT"; no DSX Exchange provider is added.
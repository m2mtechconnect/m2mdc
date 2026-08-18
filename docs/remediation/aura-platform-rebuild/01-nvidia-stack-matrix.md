# NVIDIA stack gap matrix (measured at ad0ff04)

Status vocabulary: **absent** | **fixture** | **AURA-authored** | **partial** | **implemented**.
No row may be raised without the runtime evidence named in its Evidence gate column.

| NVIDIA layer | Reference | AURA today | Status | Evidence gate to raise it |
|---|---|---|---|---|
| SimReady asset creation/validation | docs.omniverse.nvidia.com/dsx simready-assets | 52 manifest entries, 0 passed SimReady validations, 0 passed GPU validations, some USD payloads missing | absent | conversion provenance, licence, units/axis/normals/extents pass, AIF metadata layers, connection-point prims, tool versions, hashes, Kit load |
| Authoritative OpenUSD storage + stage composition | DSX system architecture | AURA-authored layered facility (`assets/facility/aura_reference_hall`) with systems/semantics/scenario sublayers | AURA-authored | real payload references to validated geometry, reproducible composition run |
| Browser GLB fallback | n/a (AURA) | React Three Fiber + 39 published GLB derivatives | implemented | must be labelled `Browser GLB preview`; derivative lineage back to one USD master |
| Omniverse Kit rendering | Kit App Streaming | `omniverseKit/config.ts` disabled in every build | absent | built Kit app, container image, GPU runtime, stage loads |
| App Streaming session mgmt | developer.nvidia.com Kit-at-scale | `streamingLibraryLoader.ts` demand loader with **no production consumer**, global name may not match the vendored UMD bundle | absent (dead code) | server-mediated session issue, short-lived credentials, health/readiness, real streamed session log |
| Simulation services / surrogate models | PhysicsNeMo, PhysicsNeMo-CFD | none; `omniverseProvider` is a permanently disabled stub returning `not-implemented` | absent | real solver endpoint, pinned version, validation dataset, tolerances |
| Simulation Data Delegate | DSX architecture | no boundary exists | absent | delegate interface separating stage data from solver results |
| Operational telemetry | DSX | MQTT ingest worker writes `connection_ingest_*` and `twin_property_values`; twin/simulation surfaces do not read them | partial | end-to-end vertical slice (Phase 5) |
| DSX Exchange event transport | NVIDIA/dsx-exchange, NATS+MQTT 3.1.1, JetStream, AsyncAPI, auth-callout, topic ACLs | generic Mosquitto broker in `infra/dsx-exchange/`; `exchangeBoundary.ts` correctly separates the AURA bridge from the vendor product | absent (correctly labelled) | official components deployed + compatibility tests against official schemas |
| AI agent interfaces (NIM/NeMo) | NVIDIA | advisory agents, human approval enforced, no NIM/NeMo endpoint | absent (correctly disclaimed) | endpoint, model+version, auth, evaluation results |
| Evidence / provenance / human approval | DSX | claims registry, data-mode contract, provenance badges, persisted run envelopes | partial | one resolved lineage across simulation page, evidence page and export |

## Upstream pinning

No upstream NVIDIA repository is vendored, and none is currently pinned by commit. The only
vendored NVIDIA artifact is `public/omniverse-webrtc-streaming-library.umd.js`
(NVIDIA Omniverse licence, entitlement-gated redistribution) which has **no production
consumer**. Phase 1 must either wire it to a real Kit path or delete it.
**Blocker B-8:** DSX Blueprint / AIF pipeline / DSX Exchange commit SHAs and licence records
must be captured from an environment with access to those repositories.

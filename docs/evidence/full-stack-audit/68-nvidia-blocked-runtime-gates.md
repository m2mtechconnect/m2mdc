# Blocked NVIDIA / DSX runtime gates

Each entry could not be validated statically. None was attempted against
production or against any NVIDIA endpoint.

| gate | required_environment | required_hardware | required_entitlement | required_fixture | required_owner | exact_unblocking_action |
|---|---|---|---|---|---|---|
| G-N1 Omniverse Kit REST reachability | Kit host on a private network behind an authenticated server-side proxy | RTX-class GPU workstation or cloud GPU instance | Omniverse licence appropriate to the deployment | a loaded facility stage | M2M infrastructure owner | Stand up the Kit host, deliver the Checkpoint C server-mediated proxy, then re-enable `readKitConfig()` behind it. Browser-direct access stays forbidden |
| G-N2 WebRTC twin streaming | signalling on 49100 + TURN | GPU host with encoder | Omniverse streaming entitlement | stage from G-N1 | M2M infrastructure owner | Provision the streaming stack; measure first-frame and interaction latency |
| G-N3 OpenUSD stage validation | Python 3 with `usd-core`, or Kit | none | none | at least one authored `.usd`/`.usda` facility stage | Twin content owner | Author or license a facility stage, add `usd-core` to a build/CI job, run `usdchecker` and record output |
| G-N4 SimReady conformance | NVIDIA SimReady tooling/specification | none | NVIDIA developer access | stage from G-N3 | Twin content owner | Obtain the current SimReady specification, run the conformance check per asset, publish per-asset results |
| G-N5 DSX Exchange live ingest | reachable DSX gateway with a published JWKS | none | DSX programme access, if such access exists | signed test events | M2M security owner | Register a `dsx_connections` row, load `DSX_GATEWAY_JWKS_JSON`, issue a signed test event, verify accept and quarantine paths |
| G-N6 End-to-end telemetry latency | live source + broker + ingest | facility instrumentation (BMS/DCIM/Redfish/SNMP) | site access | none | Facility operator | Instrument one hall, measure observed-to-displayed latency across 24 h |
| G-N7 Thermal model calibration | offline compute | GPU only if PhysicsNeMo is adopted | none for the baseline method | ≥30 days of paired sensor and setpoint data | Data-centre engineering owner | Collect the paired dataset, fit and hold out, publish MAE/RMSE against a persistence baseline |
| G-N8 NVIDIA blueprint deployment | Kubernetes with GPU nodes | GPU cluster | NGC access, NVIDIA AI Enterprise where required | blueprint container digests | Platform owner | Pin the blueprint version, pull the containers, deploy, record the run |
| G-N9 NIM / NeMo Retriever inference | GPU inference tier | GPU host | NGC / NVIDIA AI Enterprise | evaluation corpus | AI platform owner | Deploy a NIM microservice, replace the 501 `rag-*` stubs behind a server API, measure quality |
| G-N10 NVIDIA validation or certification | n/a | per programme | NVIDIA Partner Network membership | full submission package | M2M executive sponsor | Apply to the relevant NVIDIA programme; only its written outcome may be cited |
| G-N11 Stage 2B security runtime probes | disposable project `aura-dc-security-test` | none | none | synthetic tenants | Security owner | Unchanged from doc 51. **Still BLOCKED_BY_ENVIRONMENT** |

No production credential was used or requested for any gate.

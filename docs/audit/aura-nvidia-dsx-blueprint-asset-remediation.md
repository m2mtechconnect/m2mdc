# AURA NVIDIA DSX Blueprint Asset Remediation Ledger

Status: **SOURCE REMEDIATION IN PROGRESS / DSX EXACT-ROLE COVERAGE INCOMPLETE / NOT SIMREADY VALIDATED**

Implementation source: original AURA repository only. Working branch: `dsx/aura-blueprint-asset-remediation`, branched from PR #14 exact head `9c2f253f329aee9f1d6ce84b9dd1a9d58dcce441`.

This ledger separates four facts that must never be collapsed into one claim:

1. an OpenUSD or vendor source exists;
2. AURA has a traceable approved browser derivative;
3. the derivative satisfies an exact NVIDIA DSX physical role;
4. the asset has NVIDIA SimReady / hardware validation evidence.

A lower-level fact never implies a higher-level fact.

## NVIDIA public reference basis

- DSX Facilities Infrastructure Reference Design Overview: https://docs.nvidia.com/dsx/facilities-infra/reference-design-overview
- NCP Data Center Architecture: https://docs.nvidia.com/dsx/ncp/software-reference-guide/data-center-architecture
- Mission Control GB200/GB300 rack entries: https://docs.nvidia.com/mission-control/docs/rack-bring-up-install/2.3.0/config-for-provisioning/manual-addition-gb200-rack-entries.html
- Mission Control rack validation checklist: https://docs.nvidia.com/mission-control/docs/rack-bring-up-install/2.3.0/deployment-summary-validation-checklist.html

The public rack contract used by AURA is 18 compute trays, 9 NVLink switch trays, 8 power shelves, and two rack units allocated to TOR/OOB switching. The broader facilities reference includes cooling, power, core/network/shared-services, storage, and campus infrastructure. AURA records those as acceptance requirements; it does not fabricate missing geometry.

## Phase status

| Phase | State | Result |
| --- | --- | --- |
| DSX-A0 Registry truth | **COMPLETE IN SOURCE** | Generator, committed semantic bindings and asset README now point to current approved `.operations` facility derivatives; stale `luminaire` / `structural-member` semantics and false `No browser derivative` notes removed. |
| DSX-A1 NVL72 rack contract | **SCHEMA COMPLETE / SOURCE GATED** | Exact roles and 18/9/8/2 rack BOM locked. Generic servers, switches and rPDUs are explicitly disallowed as substitutes. Licensed generation-specific geometry is still required. |
| DSX-A2 Power/cooling/facilities | **SCHEMA COMPLETE / ASSET SOURCES INCOMPLETE** | Exact CDU, CRAH, chiller, pump, dry-cooler and UPS roles are in the gate. Existing DCP/CRAH/UPS generic classes do not silently satisfy them. Backup generation and BESS are tracked in the full-reference gate. |
| DSX-A3 Core/network/storage | **SCHEMA COMPLETE / ASSET SOURCES INCOMPLETE** | TAN, SMN, CIN, control-node, high-speed-storage and fiber-spine roles are explicit. Existing generic network/server/cable-tray visuals do not count as exact DSX roles. |
| DSX-A4 SimReady | **BLOCKED BY VALIDATION EVIDENCE** | No source change in this phase claims SimReady. Hardware/toolchain evidence is still required before any `SIMREADY_VALIDATED` status. |
| DSX-A5 Acceptance | **FAIL-CLOSED IN SOURCE** | Reference-facility evaluation now fails with `AURA_DSX_BLUEPRINT_ASSET_COVERAGE_INCOMPLETE` while any required facility-level exact role lacks a complete runtime evidence record. |
| DSX-A6 Reconciliation | **IMPLEMENTED FOR SOURCE/DERIVATIVE GATE; TELEMETRY/RUNTIME EXPANSION PENDING** | Exact-role reconciliation is deterministic. Future assets must add role, asset ID, source lineage, derivative checksum, validation time and runtime eligibility before the gate can turn green. |

## Current exact-role coverage

Current AURA has useful NVIDIA Data Center OpenUSD-derived visuals, but they intentionally retain their existing semantic roles such as `server-1u`, `network-switch`, `rack-pdu`, `liquid-cooling-equipment`, `liquid-cooled-rack` and `rack-core-reference`.

Those roles are **visual/reference coverage**, not exact DSX GB200/GB300 blueprint coverage.

At the time of this remediation branch:

- Rack gate: **0 / 4 exact DSX roles runtime-eligible**.
- Facility gate: **0 / 15 exact DSX roles runtime-eligible**.
- Full-reference gate: **0 / 18 exact DSX roles runtime-eligible**.

That zero is deliberate and truthful: no existing generic asset is relabelled to manufacture compliance.

## Exact DSX role ledger

| Layer | Exact role | Requirement | Current result | Next evidence |
| --- | --- | --- | --- | --- |
| Rack | `dsx-compute-tray` | GB200/GB300 compute tray ×18/rack | SOURCE GATED | Traceable NVIDIA/OEM model, approved derivative, checksum, validation |
| Rack | `dsx-nvlink-switch-tray` | NVLink switch tray ×9/rack | SOURCE GATED | Same |
| Power/rack | `dsx-power-shelf` | Power shelf ×8/rack | SOURCE GATED | Same |
| Network/rack | `dsx-tor-oob-switch` | TOR/OOB rack switching | SOURCE GATED | Exact role mapping to traceable source |
| Network | `dsx-tan-switch` | Tenant Access Network | SOURCE GATED | Approved topology-specific asset/role |
| Network | `dsx-smn-switch` | Secure Management Network | SOURCE GATED | Approved topology-specific asset/role |
| Network | `dsx-cin-switch` | Cluster Interconnect Network | SOURCE GATED | Approved topology-specific asset/role |
| Cooling | `dsx-cdu` | Cooling Distribution Unit | SOURCE GATED | Approved CDU source; existing DCP is not automatically equivalent |
| Cooling | `dsx-crah` | CRAH | SOURCE GATED | Approved generic/vendor source with documented dimensions |
| Cooling | `dsx-chiller` | Chiller | SOURCE GATED | Approved source with documented dimensions |
| Cooling | `dsx-pump` | Facility-water pump | SOURCE GATED | Approved source with documented dimensions |
| Cooling | `dsx-dry-cooler` | Outdoor heat rejection | SOURCE GATED | Approved source with documented dimensions |
| Power | `dsx-ups` | UPS | SOURCE GATED | Approved source; current generic UPS manifest row remains pending-source |
| Power | `dsx-backup-generator` | Standby generation | FULL-REFERENCE SOURCE GATED | Deployment-specific approved source |
| Power | `dsx-bess` | BESS | FULL-REFERENCE SOURCE GATED | Deployment applicability + approved source |
| Core services | `dsx-control-node` | Control nodes | SOURCE GATED | Role-specific source/placement evidence |
| Storage | `dsx-high-speed-storage` | High-speed storage | SOURCE GATED | Storage-system source/placement evidence |
| Facility | `dsx-fiber-spine` | CIN fiber spine | FULL-REFERENCE SOURCE GATED | Route/containment geometry + topology evidence |

## Existing assets that remain valid but do not satisfy the DSX exact-role gate

- NVIDIA Data Center OpenUSD-derived rack/rack-core derivatives.
- NVIDIA-derived 1U/2U server derivatives.
- NVIDIA-derived Ethernet/InfiniBand switch derivatives.
- NVIDIA-derived rack PDU, cable tray, blanking-panel and liquid-cooling derivatives.
- AURA-authored facility shell, structural columns, raised-floor tiles, airflow tiles and luminaires.

These assets remain useful and retain their provenance. They are not deleted or misleadingly renamed.

## Validation invariants

`src/dsx/blueprintAssetRequirements.ts` is the source-level DSX requirement catalogue. `scripts/verify-dsx-asset-blueprint.mjs` checks binding truth and rejects partial evidence on any future runtime-eligible exact DSX role. Reference-facility hardware acceptance independently reconciles the current scene and the exact DSX facility asset gate.

A future DSX asset may become `runtime-eligible` only when the manifest records, at minimum:

- exact semantic role;
- approved status;
- runtime eligibility;
- a loadable `.glb` derivative;
- checksum;
- validation timestamp;
- traceable source/licence/provenance appropriate to that asset.

Additional SimReady or hardware claims require their own explicit evidence and are not inferred from this contract.

## External blockers that source code cannot manufacture

1. Licensed/authorized NVIDIA or OEM generation-specific source models for GB200/GB300 compute trays, NVLink switch trays, power shelves and any other vendor-specific equipment.
2. Documented dimensions/source rights for generic facility MEP assets where no licensed vendor model is used.
3. GPU/RTX/OpenUSD validation environment required for saved hardware/SimReady evidence.
4. Runtime telemetry/topology bindings for an actual target deployment; a modelled system path is not operational telemetry.

Until these are satisfied, the correct release classification is:

**OPENUSD PIPELINE AVAILABLE / NVIDIA DATA-HALL VISUALS AVAILABLE / DSX EXACT-ROLE ASSETS INCOMPLETE / SIMREADY NOT VALIDATED**

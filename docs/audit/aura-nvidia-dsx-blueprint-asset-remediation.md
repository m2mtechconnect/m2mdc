# AURA NVIDIA DSX Blueprint Asset Remediation Ledger

Status: **SOURCE REMEDIATION IN PROGRESS / OFFICIAL DSX EVALUATION SOURCE IDENTIFIED / EXACT-ROLE COVERAGE INCOMPLETE / NOT SIMREADY VALIDATED**

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
- Official Omniverse DSX Blueprint source repository: https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories
- Official DSX content pack v2.1: https://catalog.ngc.nvidia.com/orgs/nvidia/omniverse/resources/dsx_dataset/2.1

The public rack contract used by AURA is 18 compute trays, 9 NVLink switch trays, 8 power shelves, and two rack units allocated to TOR/OOB switching. The NCP architecture also distinguishes TAN, SMN, CIN, NVLink, Control Nodes, general-purpose nodes, Utility Cluster, DC Edge Cluster and high-speed storage. The Facilities reference adds the campus power/cooling/building context including the grid substation, BESS/backup generation, Central Utility Building, dry coolers, CDUs, CRAHs and CIN fiber spine.

AURA records these as acceptance requirements; it does not fabricate missing geometry.

## Official NVIDIA DSX content source

NVIDIA now publishes the DSX Blueprint application source publicly and distributes the scene dataset separately through NGC. The NVIDIA README identifies the root stage as:

`DSX_BP/Assembly/DSX_Main_BP.usda`

The NGC resource is version `2.1`, signed, approximately 32.69 GB compressed, and governed by **NVIDIA Sample Data License for Evaluation**. NVIDIA describes it as demonstration/sample content, not production content.

AURA therefore treats it as **PRIVATE_EVALUATION_SOURCE** until a licence/legal review establishes broader production and redistribution rights. The repository must not contain the downloaded archive, extracted proprietary USD/texture content, or derived proprietary geometry merely because the dataset is publicly downloadable.

Controls added in this phase:

- `src/dsx/sourceCatalog.ts` records the source, version, root stage and rights gates.
- `.gitignore` blocks `DSX_BP/`, `DSX_BP_.zip` and `.dsx-private/`.
- `scripts/dsx/inventory-content-pack.mjs` inventories and hashes an extracted pack locally without copying geometry into AURA.
- local candidate-role inventory output defaults to `.dsx-private/` and is not committed.

## Phase status

| Phase | State | Result |
| --- | --- | --- |
| DSX-A0 Registry truth | **COMPLETE IN SOURCE** | Generator, committed semantic bindings and asset README now point to current approved `.operations` facility derivatives; stale semantics and false `No browser derivative` notes removed. |
| DSX-A1 NVL72 rack contract | **SCHEMA COMPLETE / OFFICIAL SOURCE IDENTIFIED / PRIVATE INTAKE PENDING** | Exact 18/9/8/2 rack BOM locked. Generic servers, switches and rPDUs cannot substitute. Official NGC DSX content pack is the preferred evaluation source; geometry has not been downloaded or redistributed by this branch. |
| DSX-A2 Power/cooling/facilities | **SCHEMA COMPLETE / OFFICIAL SOURCE IDENTIFIED / ASSET INGESTION PENDING** | Exact CDU, CRAH, chiller, pump, dry-cooler and UPS roles are in the facility gate. Grid substation, backup generation, BESS and CUB are tracked in the full-reference gate. Existing generic classes do not silently satisfy them. |
| DSX-A3 Core/network/storage | **SCHEMA COMPLETE / OFFICIAL SOURCE IDENTIFIED / ASSET INGESTION PENDING** | TAN, SMN, CIN, control-node, general-purpose-node, utility-cluster, DC-edge, high-speed-storage and fiber-spine roles are explicit. Generic network/server/cable-tray visuals do not count as exact DSX roles. |
| DSX-A4 SimReady | **BLOCKED BY VALIDATION EVIDENCE** | The NVIDIA dataset describes SimReady assets, but AURA does not promote any AURA runtime derivative to `SIMREADY_VALIDATED` until its own traceable validation evidence is recorded. |
| DSX-A5 Acceptance | **FAIL-CLOSED IN SOURCE** | Reference-facility evaluation fails with `AURA_DSX_BLUEPRINT_ASSET_COVERAGE_INCOMPLETE` while any required facility-level exact role lacks a complete runtime evidence record. |
| DSX-A6 Reconciliation | **IMPLEMENTED FOR SOURCE/DERIVATIVE GATE; PRIVATE PACK INVENTORY READY; TELEMETRY/RUNTIME EXPANSION PENDING** | Exact-role reconciliation is deterministic. Future assets must add role, asset ID, source lineage, derivative checksum, validation time and runtime eligibility before the gate can turn green. |

## Current exact-role coverage

Current AURA has useful NVIDIA Data Center OpenUSD-derived visuals, but they intentionally retain their existing semantic roles such as `server-1u`, `network-switch`, `rack-pdu`, `liquid-cooling-equipment`, `liquid-cooled-rack` and `rack-core-reference`.

Those roles are **visual/reference coverage**, not exact DSX GB200/GB300 blueprint coverage.

At the time of this remediation branch:

- Rack gate: **0 / 4 exact DSX roles runtime-eligible**.
- Facility gate: **0 / 18 exact DSX roles runtime-eligible**.
- Full-reference gate: **0 / 23 exact DSX roles runtime-eligible**.

That zero is deliberate and truthful: no existing generic asset is relabelled to manufacture compliance.

## Exact DSX role ledger

| Layer | Exact role | Requirement | Current result | Next evidence |
| --- | --- | --- | --- | --- |
| Rack | `dsx-compute-tray` | GB200/GB300 compute tray ×18/rack | SOURCE GATED | Inventory official content pack; map exact prim/source; approved derivative; checksum; validation |
| Rack | `dsx-nvlink-switch-tray` | NVLink switch tray ×9/rack | SOURCE GATED | Same |
| Power/rack | `dsx-power-shelf` | Power shelf ×8/rack | SOURCE GATED | Same |
| Network/rack | `dsx-tor-oob-switch` | TOR/OOB rack switching | SOURCE GATED | Exact source/prim mapping |
| Network | `dsx-tan-switch` | Tenant Access Network | SOURCE GATED | Approved topology-specific source/role |
| Network | `dsx-smn-switch` | Secure Management Network | SOURCE GATED | Approved topology-specific source/role |
| Network | `dsx-cin-switch` | Cluster Interconnect Network | SOURCE GATED | Approved topology-specific source/role |
| Cooling | `dsx-cdu` | Cooling Distribution Unit | SOURCE GATED | Approved CDU source; existing DCP is not automatically equivalent |
| Cooling | `dsx-crah` | CRAH | SOURCE GATED | Approved source/prim with documented lineage |
| Cooling | `dsx-chiller` | Chiller | SOURCE GATED | Approved source/prim with documented lineage |
| Cooling | `dsx-pump` | Facility-water pump | SOURCE GATED | Approved source/prim with documented lineage |
| Cooling | `dsx-dry-cooler` | Outdoor heat rejection | SOURCE GATED | Approved source/prim with documented lineage |
| Power | `dsx-ups` | UPS | SOURCE GATED | Approved source; current generic UPS row remains pending-source |
| Core services | `dsx-control-node` | Control Nodes | SOURCE GATED | Role-specific source/placement evidence |
| Core services | `dsx-general-purpose-node` | General-purpose Core POD nodes | SOURCE GATED | Role-specific source/placement evidence |
| Core services | `dsx-utility-cluster` | Utility Cluster | SOURCE GATED | Cluster source/placement evidence |
| Core services | `dsx-dc-edge-cluster` | DC Edge / external interface / firewall cluster | SOURCE GATED | Cluster source/placement evidence |
| Storage | `dsx-high-speed-storage` | High-speed storage | SOURCE GATED | Storage-system source/placement evidence |
| Power | `dsx-grid-substation` | Grid substation and utility interconnect | FULL-REFERENCE SOURCE GATED | Source/assembly mapping and validation |
| Power | `dsx-backup-generator` | Standby generation | FULL-REFERENCE SOURCE GATED | Deployment/source mapping |
| Power | `dsx-bess` | BESS | FULL-REFERENCE SOURCE GATED | Deployment applicability + approved source |
| Facility | `dsx-central-utility-building` | Central Utility Building | FULL-REFERENCE SOURCE GATED | Building/assembly source mapping |
| Facility | `dsx-fiber-spine` | CIN fiber spine | FULL-REFERENCE SOURCE GATED | Route/containment geometry + topology evidence |

## Existing assets that remain valid but do not satisfy the DSX exact-role gate

- NVIDIA Data Center OpenUSD-derived rack/rack-core derivatives.
- NVIDIA-derived 1U/2U server derivatives.
- NVIDIA-derived Ethernet/InfiniBand switch derivatives.
- NVIDIA-derived rack PDU, cable tray, blanking-panel and liquid-cooling derivatives.
- AURA-authored facility shell, structural columns, raised-floor tiles, airflow tiles and luminaires.

These assets remain useful and retain their provenance. They are not deleted or misleadingly renamed.

## Validation invariants

`src/dsx/blueprintAssetRequirements.ts` is the source-level DSX requirement catalogue. `scripts/verify-dsx-asset-blueprint.mjs` checks binding truth and dynamically guards every exact `dsx-*` role declared by that catalogue. Reference-facility hardware acceptance independently reconciles the current scene and the exact DSX facility asset gate.

A future DSX asset may become `runtime-eligible` only when the manifest records, at minimum:

- exact semantic role;
- approved status;
- runtime eligibility;
- a loadable `.glb` derivative where the browser delivery policy uses GLB;
- checksum;
- validation timestamp;
- traceable source/licence/provenance appropriate to that asset.

Additional SimReady or hardware claims require their own explicit evidence and are not inferred from this contract.

## Private content-pack intake procedure

1. An authorized operator downloads NVIDIA DSX Content Pack v2.1 from NGC in an approved non-production environment.
2. Extract outside the repository or under `.dsx-private/`.
3. Run `node scripts/dsx/inventory-content-pack.mjs <extracted-pack-root> --hash-candidates`.
4. Confirm the root stage exists at `DSX_BP/Assembly/DSX_Main_BP.usda` and save the local inventory evidence.
5. Review candidate prim/source paths against `src/dsx/blueprintAssetRequirements.ts`.
6. Do not publish source or derivative geometry until production/redistribution rights are explicitly established.
7. For an approved asset, execute conversion/optimization, lineage checks, visual validation and hardware/SimReady validation as applicable, then add the exact role to the AURA manifest.
8. Re-run the DSX asset audit and reference-facility acceptance. The gate turns green only from recorded evidence.

## External blockers that source code cannot manufacture

1. Authorized download/access to the NVIDIA DSX NGC content pack in an approved environment.
2. Licence/legal approval for any intended production use or redistribution of content-pack geometry/derivatives.
3. GPU/RTX/OpenUSD validation environment required for saved hardware/SimReady evidence.
4. Runtime telemetry/topology bindings for an actual target deployment; a modelled system path is not operational telemetry.

Until these are satisfied, the correct release classification is:

**OFFICIAL DSX EVALUATION SOURCE IDENTIFIED / PRIVATE INTAKE READY / NVIDIA DATA-HALL VISUALS AVAILABLE / DSX EXACT-ROLE ASSETS INCOMPLETE / SIMREADY NOT VALIDATED**

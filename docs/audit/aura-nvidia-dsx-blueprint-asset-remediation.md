# AURA NVIDIA DSX Blueprint Asset Remediation Ledger

Status: **SOURCE/RUNTIME CONTRACT HARDENED / OFFICIAL DSX EVALUATION SOURCE IDENTIFIED / EXACT-RACK INGESTION BLOCKED ON PRIVATE SOURCE / NOT SIMREADY VALIDATED**

Implementation source: original AURA repository only. Working branch: `dsx/aura-blueprint-asset-remediation`, branched from PR #14 exact head `9c2f253f329aee9f1d6ce84b9dd1a9d58dcce441`.

This ledger separates four facts that must never be collapsed into one claim:

1. an OpenUSD or vendor source exists;
2. AURA has a traceable approved browser derivative;
3. the derivative satisfies an exact NVIDIA DSX physical role and required mounted quantity;
4. the asset has NVIDIA SimReady / hardware validation evidence.

A lower-level fact never implies a higher-level fact.

## NVIDIA public reference basis

- DSX Facilities Infrastructure Reference Design Overview: https://docs.nvidia.com/dsx/facilities-infra/reference-design-overview
- NCP Data Center Architecture: https://docs.nvidia.com/dsx/ncp/software-reference-guide/data-center-architecture
- Mission Control GB200/GB300 rack entries: https://docs.nvidia.com/mission-control/docs/rack-bring-up-install/2.3.0/config-for-provisioning/manual-addition-gb200-rack-entries.html
- Mission Control rack validation checklist: https://docs.nvidia.com/mission-control/docs/rack-bring-up-install/2.3.0/deployment-summary-validation-checklist.html
- Official Omniverse DSX Blueprint source repository: https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories
- Official DSX content pack v2.1: https://catalog.ngc.nvidia.com/orgs/nvidia/omniverse/resources/dsx_dataset/2.1

The public rack contract used by AURA is 18 compute trays, 9 NVLink switch trays, 8 power shelves, and two TOR/OOB units. The exact 48U placement contract encoded in AURA is power shelves at RU 6–9 and 39–42, compute trays at RU 11–18 and 28–37, NVLink switch trays at RU 19–27, and TOR/OOB at RU 44–45. The NCP architecture also distinguishes TAN, SMN, CIN, NVLink, Control Nodes, general-purpose nodes, Utility Cluster, DC Edge Cluster and high-speed storage. The Facilities reference adds the campus power/cooling/building context including the grid substation, BESS/backup generation, Central Utility Building, dry coolers, CDUs, CRAHs and CIN fiber spine.

AURA records these as acceptance requirements; it does not fabricate missing geometry.

## Official NVIDIA DSX content source

NVIDIA publishes the DSX Blueprint application source publicly and distributes the scene dataset separately through NGC. The NVIDIA README identifies the root stage as:

`DSX_BP/Assembly/DSX_Main_BP.usda`

The NGC resource is version `2.1`, signed, approximately 32.69 GB compressed, and governed by **NVIDIA Sample Data License for Evaluation**. NVIDIA describes it as demonstration/sample content, not production content.

AURA therefore treats it as **PRIVATE_EVALUATION_SOURCE** until a licence/legal review establishes broader production and redistribution rights. The repository must not contain the downloaded archive, extracted proprietary USD/texture content, or derived proprietary geometry merely because the dataset is publicly downloadable.

Controls implemented:

- `src/dsx/sourceCatalog.ts` records the source, version, root stage and rights gates.
- `.gitignore` blocks `DSX_BP/`, `DSX_BP_.zip` and `.dsx-private/`.
- `scripts/dsx/inventory-content-pack.mjs` inventories and hashes an extracted pack locally without copying geometry into AURA.
- `scripts/dsx/build-source-map-from-inventory.ts` converts private inventory into a candidate map but never promotes filename matches to verified mappings.
- `scripts/dsx/validate-source-map.ts` validates the source-map contract.
- `src/dsx/sourceMap.ts` requires exact USD path, exact prim path and source checksum for `verified` mappings and requires both production and redistribution approval before a mapping can be promoted to AURA's public runtime channel.
- `scripts/dsx/extract-source-prim.py` creates a thin private USDA reference wrapper for one verified prim without flattening or copying NVIDIA geometry.
- `scripts/dsx/prepare-rack-derivative-jobs.ts` validates the source-pack root checksum and each rack-role source checksum before producing a private derivative job plan. It does not convert or publish anything.

## Phase status

| Phase | State | Result |
| --- | --- | --- |
| DSX-A0 Registry truth | **COMPLETE IN SOURCE** | Generator, committed semantic bindings and asset README point to current approved `.operations` facility derivatives; stale semantics and false no-derivative notes removed. |
| DSX-A1 NVL72 rack contract | **RUNTIME CONTRACT COMPLETE / SOURCE INGESTION PENDING** | All four rack roles are first-class AURA semantic roles. Exact 18/9/8/2 quantities and 48U positions are encoded and tested. Generic servers, switches and rPDUs cannot substitute. Private derivative preflight is ready. |
| DSX-A2 Power/cooling/facilities | **SCHEMA COMPLETE / OFFICIAL SOURCE IDENTIFIED / ASSET INGESTION PENDING** | Exact CDU, CRAH, chiller, pump, dry-cooler and UPS roles are in the facility gate. Grid substation, backup generation, BESS and CUB are tracked in the full-reference gate. |
| DSX-A3 Core/network/storage | **SCHEMA COMPLETE / OFFICIAL SOURCE IDENTIFIED / ASSET INGESTION PENDING** | TAN, SMN, CIN, control-node, general-purpose-node, utility-cluster, DC-edge, high-speed-storage and fiber-spine roles are first-class runtime semantics and explicit requirements. |
| DSX-A4 SimReady | **BLOCKED BY VALIDATION EVIDENCE** | No AURA runtime derivative is promoted to `SIMREADY_VALIDATED` from source-pack marketing or metadata alone. |
| DSX-A5 Acceptance | **FAIL-CLOSED IN SOURCE** | Facility acceptance fails on missing exact roles and independently checks exact 18/9/8/2 mounted quantities. Asset-complete but quantity-incomplete racks return `AURA_DSX_RACK_BOM_INCOMPLETE`. |
| DSX-A6 Reconciliation | **IMPLEMENTED / PRIVATE PACK INTAKE READY / RUNTIME ASSET INGESTION PENDING** | Source map, rights gate, exact-role reconciliation, quantity validation, 48U layout and derivative preflight are deterministic. |

## Current exact-role coverage

Current AURA has useful NVIDIA Data Center OpenUSD-derived visuals, but they intentionally retain their existing semantic roles such as `server-1u`, `network-switch`, `rack-pdu`, `liquid-cooling-equipment`, `liquid-cooled-rack` and `rack-core-reference`.

Those roles are **visual/reference coverage**, not exact DSX GB200/GB300 blueprint coverage.

Current manifest evidence remains:

- Rack gate: **0 / 4 exact DSX roles runtime-eligible**.
- Facility gate: **0 / 18 exact DSX roles runtime-eligible**.
- Full-reference gate: **0 / 23 exact DSX roles runtime-eligible**.
- First-rack quantity target once assets mount: **37 physical objects = 18 + 9 + 8 + 2**.

That zero is deliberate and truthful: no existing generic asset is relabelled to manufacture compliance.

## Exact DSX role ledger

| Layer | Exact role | Requirement | Current result | Next evidence |
| --- | --- | --- | --- | --- |
| Rack | `dsx-compute-tray` | GB200/GB300 compute tray ×18/rack | SOURCE GATED | Inventory official content pack; verify exact USD/prim/checksum; private derivative validation |
| Rack | `dsx-nvlink-switch-tray` | NVLink switch tray ×9/rack | SOURCE GATED | Same |
| Power/rack | `dsx-power-shelf` | Power shelf ×8/rack | SOURCE GATED | Same |
| Network/rack | `dsx-tor-oob-switch` | TOR/OOB ×2/rack | SOURCE GATED | Exact source/prim mapping |
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

- `src/components/twin-visualization/assetRegistry.ts` owns all 23 exact DSX roles as first-class runtime semantics.
- `src/dsx/blueprintAssetRequirements.ts` owns 4 rack / 18 facility / 23 full-reference requirements.
- `src/dsx/rackLayout.ts` owns the exact 48U first-rack placement contract.
- `src/dsx/rackBomValidation.ts` validates exact mounted quantities; generic roles contribute zero.
- `src/dsx/sourceMap.ts` owns source/prim/checksum and rights gates.
- `scripts/verify-dsx-asset-blueprint.mjs` guards binding truth and dynamically guards every exact `dsx-*` role.
- Reference-facility hardware acceptance independently reconciles current scene geometry, DSX asset presence and rack BOM quantities.

A future DSX asset may become runtime-eligible only when the manifest records, at minimum:

- exact semantic role;
- approved status;
- runtime eligibility;
- a loadable derivative appropriate to the browser delivery policy;
- checksum;
- validation timestamp;
- traceable source/licence/provenance appropriate to that asset.

A verified private source mapping may be evaluated privately, but AURA's public runtime promotion additionally requires explicit production-use and redistribution approval. SimReady or hardware claims require their own explicit evidence and are not inferred from this contract.

## Private content-pack intake procedure

1. An authorized operator downloads NVIDIA DSX Content Pack v2.1 from NGC in an approved non-production environment.
2. Extract outside the repository or under `.dsx-private/`.
3. Run `node scripts/dsx/inventory-content-pack.mjs <extracted-pack-root> --hash-candidates`.
4. Confirm the root stage exists at `DSX_BP/Assembly/DSX_Main_BP.usda` and save the local inventory evidence.
5. Run `bun scripts/dsx/build-source-map-from-inventory.ts <inventory.json>`.
6. Inspect the composed USD stage manually and promote a mapping to `verified` only after exact source USD, prim path and checksum are established.
7. Run `bun scripts/dsx/validate-source-map.ts <source-map.json>`.
8. Once all four rack roles are verified, run `bun scripts/dsx/prepare-rack-derivative-jobs.ts <source-map.json> <extracted-pack-root>`.
9. Use `scripts/dsx/extract-source-prim.py` plus the existing `convert_pack_asset.py` and `finish_derivative.mjs` pipeline in the private environment. Select quality budgets from measured source complexity, not guessed generic targets.
10. Do not publish source or derivative geometry until production and redistribution rights are explicitly established.
11. After approved conversion, lineage checks, visual validation and hardware/SimReady validation as applicable, add the exact role to the AURA manifest.
12. Mount one complete DSX rack and require 18/9/8/2 runtime coverage before scaling the same contract to additional racks.

## Qualification

The last application-code head `45bf21eeac530dbe68cfb3ac10735a33e882e0d7` passed:

- Production Perimeter;
- committed OpenUSD binding verifier;
- TypeScript typecheck;
- DSX requirement/source-map/rack-layout/rack-BOM/reference-facility focused tests;
- production-mode application build.

The current branch head includes only this ledger update after that application-code head. Exact-head qualification must still complete for the current SHA; prior evidence is retained as code evidence but is not substituted for current-head release evidence.

## External blockers that source code cannot manufacture

1. Authorized download/access to NVIDIA DSX Content Pack v2.1 in an approved environment.
2. Private inspection of the official composed USD stage to identify exact source files and prims.
3. Licence/legal approval for any intended production use or redistribution of content-pack geometry/derivatives.
4. GPU/RTX/OpenUSD validation environment required for saved hardware/SimReady evidence.
5. Runtime telemetry/topology bindings for an actual target deployment; a modelled system path is not operational telemetry.

Until these are satisfied, the correct classification is:

**DSX RUNTIME CONTRACT READY / PRIVATE SOURCE INTAKE + DERIVATIVE PREFLIGHT READY / EXACT DSX ASSETS 0/23 / FIRST RACK 0/37 MOUNTED / SIMREADY NOT VALIDATED**

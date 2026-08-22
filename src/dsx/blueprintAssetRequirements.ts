/**
 * NVIDIA DSX blueprint asset requirements.
 *
 * This module is an acceptance contract, not a claim of installed hardware.
 * A requirement is satisfied only by an exact semantic role carried by an
 * approved, runtime-eligible, checksum-backed derivative. Generic AURA assets
 * and older NVIDIA data-centre pack assets may be useful visual references,
 * but they never satisfy a generation-specific DSX role by approximation.
 */

export type DsxAssetLayer =
  | 'rack'
  | 'network'
  | 'cooling'
  | 'power'
  | 'core-services'
  | 'storage'
  | 'facility';

export type DsxBlueprintGate = 'rack' | 'facility' | 'full-reference';

export interface DsxAssetRequirement {
  id: string;
  semanticRole: string;
  label: string;
  layer: DsxAssetLayer;
  gates: DsxBlueprintGate[];
  quantityPerGpuRack?: number;
  exactVendorGeometryRequired: boolean;
  genericSubstitutionAllowed: boolean;
  sourceUrl: string;
  sourceNote: string;
  currentApproximationRoles?: string[];
  applicability?: string;
}

export const DSX_RACK_BOM = Object.freeze({
  computeTraysPerRack: 18,
  nvlinkSwitchTraysPerRack: 9,
  powerShelvesPerRack: 8,
  torOobSwitchesPerRack: 2,
});

const NCP_ARCHITECTURE =
  'https://docs.nvidia.com/dsx/ncp/software-reference-guide/data-center-architecture';
const FACILITIES_REFERENCE =
  'https://docs.nvidia.com/dsx/facilities-infra/reference-design-overview';
const RACK_LAYOUT =
  'https://docs.nvidia.com/mission-control/docs/rack-bring-up-install/2.3.0/config-for-provisioning/manual-addition-gb200-rack-entries.html';
const RACK_CHECKLIST =
  'https://docs.nvidia.com/mission-control/docs/rack-bring-up-install/2.3.0/deployment-summary-validation-checklist.html';

/**
 * Publicly verifiable DSX physical classes. Requirements that need licensed
 * NVIDIA/OEM geometry remain source-gated until a traceable model is ingested.
 */
export const DSX_ASSET_REQUIREMENTS: readonly DsxAssetRequirement[] = [
  {
    id: 'rack.compute-tray',
    semanticRole: 'dsx-compute-tray',
    label: 'GB200/GB300 compute tray',
    layer: 'rack',
    gates: ['rack', 'facility', 'full-reference'],
    quantityPerGpuRack: DSX_RACK_BOM.computeTraysPerRack,
    exactVendorGeometryRequired: true,
    genericSubstitutionAllowed: false,
    sourceUrl: RACK_LAYOUT,
    sourceNote: 'Mission Control rack inventory requires 18 compute trays per GB200/GB300 NVL72 rack.',
    currentApproximationRoles: ['server-1u', 'server-2u'],
  },
  {
    id: 'rack.nvlink-switch-tray',
    semanticRole: 'dsx-nvlink-switch-tray',
    label: 'NVLink switch tray',
    layer: 'rack',
    gates: ['rack', 'facility', 'full-reference'],
    quantityPerGpuRack: DSX_RACK_BOM.nvlinkSwitchTraysPerRack,
    exactVendorGeometryRequired: true,
    genericSubstitutionAllowed: false,
    sourceUrl: RACK_LAYOUT,
    sourceNote: 'Mission Control rack inventory requires 9 NVLink switch trays per GB200/GB300 NVL72 rack.',
    currentApproximationRoles: ['network-switch'],
  },
  {
    id: 'rack.power-shelf',
    semanticRole: 'dsx-power-shelf',
    label: 'NVL72 power shelf',
    layer: 'power',
    gates: ['rack', 'facility', 'full-reference'],
    quantityPerGpuRack: DSX_RACK_BOM.powerShelvesPerRack,
    exactVendorGeometryRequired: true,
    genericSubstitutionAllowed: false,
    sourceUrl: RACK_CHECKLIST,
    sourceNote: 'Mission Control validation requires 8 power shelves per GB200/GB300 NVL72 rack.',
    currentApproximationRoles: ['rack-pdu'],
  },
  {
    id: 'rack.tor-oob',
    semanticRole: 'dsx-tor-oob-switch',
    label: 'Rack TOR/OOB switch',
    layer: 'network',
    gates: ['rack', 'facility', 'full-reference'],
    quantityPerGpuRack: DSX_RACK_BOM.torOobSwitchesPerRack,
    exactVendorGeometryRequired: true,
    genericSubstitutionAllowed: false,
    sourceUrl: RACK_LAYOUT,
    sourceNote: 'The published 48U GB200/GB300 rack layout reserves two rack units for SN2201 TOR/OOB switching.',
    currentApproximationRoles: ['network-switch'],
  },
  {
    id: 'network.tan',
    semanticRole: 'dsx-tan-switch',
    label: 'Tenant Access Network fabric equipment',
    layer: 'network',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'DSX defines TAN as a distinct Ethernet fabric for north/south traffic.',
    currentApproximationRoles: ['network-switch'],
  },
  {
    id: 'network.smn',
    semanticRole: 'dsx-smn-switch',
    label: 'Secure Management Network fabric equipment',
    layer: 'network',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'DSX defines SMN as a distinct secure out-of-band management network.',
    currentApproximationRoles: ['network-switch'],
  },
  {
    id: 'network.cin',
    semanticRole: 'dsx-cin-switch',
    label: 'Cluster Interconnect Network fabric equipment',
    layer: 'network',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'DSX defines CIN as the east/west scale-out fabric connecting GPU racks.',
    currentApproximationRoles: ['network-switch'],
  },
  {
    id: 'cooling.cdu',
    semanticRole: 'dsx-cdu',
    label: 'Cooling Distribution Unit',
    layer: 'cooling',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The DSX facilities reference design uses liquid-to-liquid CDUs in mechanical galleries.',
    currentApproximationRoles: ['liquid-cooling-equipment'],
  },
  {
    id: 'cooling.crah',
    semanticRole: 'dsx-crah',
    label: 'Computer Room Air Handler',
    layer: 'cooling',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'CRAHs provide air cooling for remaining data-hall and occupied-space loads.',
  },
  {
    id: 'cooling.chiller',
    semanticRole: 'dsx-chiller',
    label: 'Central utility chiller',
    layer: 'cooling',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The DSX Central Utility Building houses chillers and pumps serving the facility-water loop.',
  },
  {
    id: 'cooling.pump',
    semanticRole: 'dsx-pump',
    label: 'Facility-water pump',
    layer: 'cooling',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The DSX Central Utility Building includes pumps for facility-water distribution.',
  },
  {
    id: 'cooling.dry-cooler',
    semanticRole: 'dsx-dry-cooler',
    label: 'Dry cooler / outdoor heat rejection',
    layer: 'cooling',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The facilities reference design uses paired dry coolers for outdoor heat rejection.',
  },
  {
    id: 'power.ups',
    semanticRole: 'dsx-ups',
    label: 'UPS equipment',
    layer: 'power',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'UPS support is represented for critical Core portions of the DSX facilities design.',
  },
  {
    id: 'core.control-node',
    semanticRole: 'dsx-control-node',
    label: 'Control node',
    layer: 'core-services',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'The Core POD includes Control Nodes for control planes and operator services.',
    currentApproximationRoles: ['server-1u', 'server-2u'],
  },
  {
    id: 'core.general-purpose-node',
    semanticRole: 'dsx-general-purpose-node',
    label: 'General-purpose Core POD node',
    layer: 'core-services',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'The Core POD includes general-purpose non-GPU compute for workloads and services.',
    currentApproximationRoles: ['server-1u', 'server-2u'],
  },
  {
    id: 'core.utility-cluster',
    semanticRole: 'dsx-utility-cluster',
    label: 'Utility cluster',
    layer: 'core-services',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'The Core POD includes a utility cluster used to bootstrap the data center.',
  },
  {
    id: 'core.dc-edge',
    semanticRole: 'dsx-dc-edge-cluster',
    label: 'DC Edge cluster',
    layer: 'core-services',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'The Core POD includes a DC Edge cluster for external network interfaces and firewalls.',
  },
  {
    id: 'storage.high-speed',
    semanticRole: 'dsx-high-speed-storage',
    label: 'High-speed storage',
    layer: 'storage',
    gates: ['facility', 'full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: false,
    sourceUrl: NCP_ARCHITECTURE,
    sourceNote: 'The Core POD includes server-specific software-defined storage nodes or appliances.',
  },
  {
    id: 'power.grid-substation',
    semanticRole: 'dsx-grid-substation',
    label: 'Grid substation and utility interconnect',
    layer: 'power',
    gates: ['full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The campus reference includes the service substation, HV-to-34.5 kV transformation and campus switchgear backbone.',
  },
  {
    id: 'power.backup-generation',
    semanticRole: 'dsx-backup-generator',
    label: 'Backup generation',
    layer: 'power',
    gates: ['full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The reference campus includes standby generation for critical Core systems.',
  },
  {
    id: 'power.bess',
    semanticRole: 'dsx-bess',
    label: 'Battery Energy Storage System',
    layer: 'power',
    gates: ['full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'BESS is represented in the reference campus; applicability and sizing are deployment-specific.',
    applicability: 'Case-by-case deployment decision.',
  },
  {
    id: 'facility.central-utility-building',
    semanticRole: 'dsx-central-utility-building',
    label: 'Central Utility Building',
    layer: 'facility',
    gates: ['full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The campus reference uses CUBs to house chillers, pumps and facility-water distribution.',
  },
  {
    id: 'facility.fiber-spine',
    semanticRole: 'dsx-fiber-spine',
    label: 'Cluster interconnect fiber spine',
    layer: 'facility',
    gates: ['full-reference'],
    exactVendorGeometryRequired: false,
    genericSubstitutionAllowed: true,
    sourceUrl: FACILITIES_REFERENCE,
    sourceNote: 'The DSX campus reference design includes a Cluster Interconnect fiber spine.',
    currentApproximationRoles: ['cable-tray'],
  },
] as const;

export interface DsxManifestAssetLike {
  assetId: string;
  semanticRole?: unknown;
  approvalStatus?: string;
  runtimeEligible?: boolean;
  glbUrl?: string | null;
  checksum?: string | null;
  lastValidatedAt?: string | null;
}

export type DsxAssetCoverageState =
  | 'runtime-eligible'
  | 'published-not-runtime-eligible'
  | 'source-gated';

export interface DsxAssetCoverageRow {
  requirement: DsxAssetRequirement;
  state: DsxAssetCoverageState;
  matchingAssetIds: string[];
}

export function dsxRequirementsForGate(gate: DsxBlueprintGate): DsxAssetRequirement[] {
  return DSX_ASSET_REQUIREMENTS.filter((requirement) => requirement.gates.includes(gate));
}

/** Exact-role coverage only. Approximation roles are intentionally ignored. */
export function reconcileDsxAssetRequirements(
  assets: readonly DsxManifestAssetLike[],
  gate: DsxBlueprintGate = 'facility',
): DsxAssetCoverageRow[] {
  return dsxRequirementsForGate(gate).map((requirement) => {
    const matching = assets.filter(
      (asset) => typeof asset.semanticRole === 'string' && asset.semanticRole === requirement.semanticRole,
    );
    const runtime = matching.filter(
      (asset) =>
        asset.approvalStatus === 'approved' &&
        asset.runtimeEligible === true &&
        typeof asset.glbUrl === 'string' &&
        asset.glbUrl.endsWith('.glb') &&
        typeof asset.checksum === 'string' &&
        asset.checksum.length > 0 &&
        typeof asset.lastValidatedAt === 'string' &&
        asset.lastValidatedAt.length > 0,
    );
    return {
      requirement,
      state:
        runtime.length > 0
          ? 'runtime-eligible'
          : matching.length > 0
            ? 'published-not-runtime-eligible'
            : 'source-gated',
      matchingAssetIds: matching.map((asset) => asset.assetId),
    };
  });
}

export function hasCompleteDsxAssetCoverage(
  assets: readonly DsxManifestAssetLike[],
  gate: DsxBlueprintGate = 'facility',
): boolean {
  return reconcileDsxAssetRequirements(assets, gate).every(
    (row) => row.state === 'runtime-eligible',
  );
}

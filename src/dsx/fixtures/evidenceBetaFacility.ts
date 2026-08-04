/**
 * Deterministic DSX-compatible Evidence Beta facility.
 *
 * SIMULATED FIXTURE. Never inserted into production. Version-controlled,
 * resettable, and fully reproducible from EVIDENCE_BETA_SEED.
 */
import { stableUuid } from './determinism';
import type { AssetMapping, AssetClass } from '../contracts/assetMapping';

export const EVIDENCE_BETA_SEED = 20260804;
export const EVIDENCE_BETA_VERSION = '1.0.0';
export const EVIDENCE_BETA_ORG_ID = stableUuid('evidence-beta:org');
export const EVIDENCE_BETA_SITE_ID = stableUuid('evidence-beta:site');
export const EVIDENCE_BETA_CONNECTION_ID = stableUuid('evidence-beta:connection');
export const EVIDENCE_BETA_SOURCE_SYSTEM = 'evidence-beta-bms';

export interface FixtureAsset {
  aura_asset_id: string;
  source_asset_id: string;
  name: string;
  asset_class: AssetClass;
  usd_prim_path: string;
  parent_id: string | null;
  manufacturer: string;
  model: string;
  /** Electrical / thermal metadata used by the KPI calculators. */
  rated_kw: number | null;
  design_inlet_c: number | null;
  connection_points: string[];
  simready: boolean;
  metadata_completeness: number; // 0..1
  approval_status: 'draft' | 'pending_review' | 'approved';
}

const ROOT = '/World/EvidenceBeta';

function asset(a: Omit<FixtureAsset, 'aura_asset_id'>): FixtureAsset {
  return { ...a, aura_asset_id: stableUuid(`evidence-beta:asset:${a.source_asset_id}`) };
}

const site = asset({
  source_asset_id: 'SITE-01',
  name: 'Evidence Beta Site',
  asset_class: 'site',
  usd_prim_path: `${ROOT}/Site_01`,
  parent_id: null,
  manufacturer: 'n/a',
  model: 'n/a',
  rated_kw: 2400,
  design_inlet_c: null,
  connection_points: [],
  simready: false,
  metadata_completeness: 0.8,
  approval_status: 'approved',
});

const hall = asset({
  source_asset_id: 'HALL-01',
  name: 'Data Hall 1',
  asset_class: 'data_hall',
  usd_prim_path: `${ROOT}/Site_01/Hall_01`,
  parent_id: site.aura_asset_id,
  manufacturer: 'n/a',
  model: 'n/a',
  rated_kw: 1600,
  design_inlet_c: 24,
  connection_points: [],
  simready: false,
  metadata_completeness: 0.85,
  approval_status: 'approved',
});

const racks: FixtureAsset[] = Array.from({ length: 8 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return asset({
    source_asset_id: `RACK-${n}`,
    name: `Rack ${n}`,
    asset_class: 'rack',
    usd_prim_path: `${ROOT}/Site_01/Hall_01/Rack_${n}`,
    parent_id: hall.aura_asset_id,
    manufacturer: 'Generic',
    model: 'AI-Rack-42U',
    rated_kw: 120,
    design_inlet_c: 27,
    connection_points: [i < 4 ? 'RPP-01' : 'RPP-02', i < 4 ? 'CRAH-01' : 'CRAH-02'],
    simready: i < 6,
    metadata_completeness: i < 6 ? 0.95 : 0.6,
    approval_status: i < 6 ? 'approved' : 'pending_review',
  });
});

const coolingUnits: FixtureAsset[] = ['01', '02'].map((n, i) =>
  asset({
    source_asset_id: `CRAH-${n}`,
    name: `Cooling Unit ${n}`,
    asset_class: 'cooling_unit',
    usd_prim_path: `${ROOT}/Site_01/Hall_01/CRAH_${n}`,
    parent_id: hall.aura_asset_id,
    manufacturer: 'Generic',
    model: 'CRAH-350',
    rated_kw: 350,
    design_inlet_c: 18,
    connection_points: ['CDU-01', ...racks.filter((_, ri) => (i === 0 ? ri < 4 : ri >= 4)).map((r) => r.source_asset_id)],
    simready: true,
    metadata_completeness: 0.9,
    approval_status: 'approved',
  }),
);

const cdu = asset({
  source_asset_id: 'CDU-01',
  name: 'Coolant Distribution Unit 01',
  asset_class: 'cdu',
  usd_prim_path: `${ROOT}/Site_01/Hall_01/CDU_01`,
  parent_id: hall.aura_asset_id,
  manufacturer: 'Generic',
  model: 'CDU-700',
  rated_kw: 700,
  design_inlet_c: 32,
  connection_points: ['CRAH-01', 'CRAH-02'],
  simready: true,
  metadata_completeness: 0.88,
  approval_status: 'approved',
});

const ups = asset({
  source_asset_id: 'UPS-01',
  name: 'UPS 01',
  asset_class: 'ups',
  usd_prim_path: `${ROOT}/Site_01/Electrical/UPS_01`,
  parent_id: site.aura_asset_id,
  manufacturer: 'Generic',
  model: 'UPS-1500',
  rated_kw: 1500,
  design_inlet_c: null,
  connection_points: ['RPP-01', 'RPP-02'],
  simready: false,
  metadata_completeness: 0.7,
  approval_status: 'approved',
});

const rpps: FixtureAsset[] = ['01', '02'].map((n, i) =>
  asset({
    source_asset_id: `RPP-${n}`,
    name: `Remote Power Panel ${n}`,
    asset_class: 'rpp',
    usd_prim_path: `${ROOT}/Site_01/Electrical/RPP_${n}`,
    parent_id: ups.aura_asset_id,
    manufacturer: 'Generic',
    model: 'RPP-600',
    rated_kw: 600,
    design_inlet_c: null,
    connection_points: racks.filter((_, ri) => (i === 0 ? ri < 4 : ri >= 4)).map((r) => r.source_asset_id),
    simready: false,
    metadata_completeness: 0.65,
    approval_status: 'approved',
  }),
);

/** Environmental + per-rack sensors. */
const sensors: FixtureAsset[] = [
  asset({
    source_asset_id: 'ENV-01',
    name: 'Hall Environmental Sensor',
    asset_class: 'sensor',
    usd_prim_path: `${ROOT}/Site_01/Hall_01/Sensor_ENV_01`,
    parent_id: hall.aura_asset_id,
    manufacturer: 'Generic',
    model: 'ENV-T/RH',
    rated_kw: null,
    design_inlet_c: null,
    connection_points: [],
    simready: false,
    metadata_completeness: 0.75,
    approval_status: 'approved',
  }),
  ...racks.flatMap((r) => [
    asset({
      source_asset_id: `${r.source_asset_id}-PWR`,
      name: `${r.name} Power Meter`,
      asset_class: 'sensor',
      usd_prim_path: `${r.usd_prim_path}/Sensor_Power`,
      parent_id: r.aura_asset_id,
      manufacturer: 'Generic',
      model: 'PM-3P',
      rated_kw: null,
      design_inlet_c: null,
      connection_points: [r.source_asset_id],
      simready: false,
      metadata_completeness: 0.9,
      approval_status: 'approved',
    }),
    asset({
      source_asset_id: `${r.source_asset_id}-INLET`,
      name: `${r.name} Inlet Temperature`,
      asset_class: 'sensor',
      usd_prim_path: `${r.usd_prim_path}/Sensor_Inlet`,
      parent_id: r.aura_asset_id,
      manufacturer: 'Generic',
      model: 'RTD-100',
      rated_kw: null,
      design_inlet_c: 27,
      connection_points: [r.source_asset_id],
      simready: false,
      metadata_completeness: 0.9,
      approval_status: 'approved',
    }),
  ]),
];

export const EVIDENCE_BETA_ASSETS: FixtureAsset[] = [
  site,
  hall,
  ...racks,
  ...coolingUnits,
  cdu,
  ups,
  ...rpps,
  ...sensors,
];

export const EVIDENCE_BETA_RACKS = racks;
export const EVIDENCE_BETA_COOLING = coolingUnits;
export const EVIDENCE_BETA_SITE = site;
export const EVIDENCE_BETA_HALL = hall;
export const EVIDENCE_BETA_CDU = cdu;
export const EVIDENCE_BETA_UPS = ups;
export const EVIDENCE_BETA_RPPS = rpps;

export function assetBySourceId(sourceId: string): FixtureAsset | undefined {
  return EVIDENCE_BETA_ASSETS.find((a) => a.source_asset_id === sourceId);
}

export function assetByAuraId(id: string): FixtureAsset | undefined {
  return EVIDENCE_BETA_ASSETS.find((a) => a.aura_asset_id === id);
}

const EFFECTIVE_FROM = '2026-01-01T00:00:00.000Z';

/**
 * Approved mappings for every asset EXCEPT the intentionally unmapped
 * `RACK-09-INLET` probe used by the unknown-mapping fixture.
 */
export const EVIDENCE_BETA_MAPPINGS: AssetMapping[] = EVIDENCE_BETA_ASSETS.map((a) => ({
  mapping_id: stableUuid(`evidence-beta:mapping:${a.source_asset_id}`),
  org_id: EVIDENCE_BETA_ORG_ID,
  source_system: EVIDENCE_BETA_SOURCE_SYSTEM,
  source_asset_id: a.source_asset_id,
  aura_asset_id: a.aura_asset_id,
  usd_prim_path: a.usd_prim_path,
  asset_class: a.asset_class,
  mapping_version: 1,
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  approval_status: a.approval_status === 'approved' ? 'approved' : 'pending_review',
  evidence_ref: `fixture://evidence-beta/${EVIDENCE_BETA_VERSION}/${a.source_asset_id}`,
  created_by: 'evidence-beta-fixture',
  approved_by: a.approval_status === 'approved' ? 'evidence-beta-fixture' : null,
}));

/** Source id that intentionally has no mapping (quarantine fixture). */
export const UNMAPPED_SOURCE_ID = 'RACK-09-INLET';
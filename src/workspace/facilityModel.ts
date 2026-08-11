/**
 * Authoritative AURA facility model for the engineering workspace.
 *
 * Every KPI, asset and derived figure rendered inside the workspace comes
 * from this module, so a value such as PUE can never diverge between the
 * canvas, the KPI strip, the context panel and the evidence drawer.
 *
 * All values are deterministic functions of the selected facility record.
 * They are SIMULATED model outputs, never measured telemetry.
 */
import { useMemo } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { resolveFacilityNaming } from '@/workspace/facilityNaming';
import { formatPower, normaliseStoredCapacityKw, powerAriaLabel } from '@/lib/units/power';

// Power formatting has a single owner: `@/lib/units/power`. Re-exported here
// so existing workspace imports keep working without a second implementation.
export { formatPower, powerAriaLabel };

/** Deterministic 32-bit hash -> seeded PRNG (no runtime randomness). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type AssetKind = 'rack' | 'row' | 'cooling' | 'power' | 'network' | 'facility';

export interface FacilityAsset {
  id: string;
  name: string;
  kind: AssetKind;
  /** Short subsystem label used by the inspector and tool rail filters. */
  subsystem: string;
  attributes: Array<{ label: string; value: string }>;
  /** Ids of assets this asset depends on, used for impact tracing. */
  dependencies: string[];
}

export interface FacilityDefinition {
  id: string;
  name: string;
  city: string;
  regionCode: string;
  tier: string;
  capacityKw: number;
  rackCount: number;
  rowCount: number;
  pueTarget: number;
  renewableTargetPct: number;
  carbonIntensity: number;
  sovereigntyLevel: string;
  industry: string;
  /**
   * Racks the model can plausibly support at design capacity. `rackCount` is
   * the rendered subset, capped so the canvas stays interactive.
   */
  designRackEstimate: number;
}

export interface FacilityNamingContext {
  /** Facility classification, e.g. "Tier-III · Sovereign AI data centre". */
  classification: string;
  /** Region → city → facility breadcrumb trail. */
  breadcrumb: string[];
  /** True when `name` was derived because the stored twin name is a placeholder. */
  isDerivedName: boolean;
  /** Original stored twin name, kept for provenance. */
  storedName: string | null;
}

export interface ConfigOverrides {
  coolingSetpointC: number;
  gpuPowerCapPct: number;
  workloadDensityPct: number;
  renewableMixPct: number;
}

export const DEFAULT_OVERRIDES: ConfigOverrides = {
  coolingSetpointC: 24,
  gpuPowerCapPct: 100,
  workloadDensityPct: 70,
  renewableMixPct: 60,
};

export type KpiKey =
  | 'pue'
  | 'itLoadKw'
  | 'gpuUtilization'
  | 'thermalStability'
  | 'coolingEfficiency'
  | 'capacityHeadroom'
  | 'carbonIntensity'
  | 'energyCostPerMwh'
  | 'sovereigntyScore';

export interface KpiDescriptor {
  key: KpiKey;
  label: string;
  unit: string;
  precision: number;
  /** Lower values are better for this metric. */
  lowerIsBetter: boolean;
  /** Overlay domain highlighted on the facility model when selected. */
  overlay: string;
  derivation: string;
  inputs: string[];
}

export const KPI_DESCRIPTORS: Record<KpiKey, KpiDescriptor> = {
  pue: {
    key: 'pue',
    label: 'PUE',
    unit: '',
    precision: 2,
    lowerIsBetter: true,
    overlay: 'power',
    derivation: 'total facility power / IT load, modelled from cooling setpoint, workload density and design capacity.',
    inputs: ['Design capacity (kW)', 'Cooling setpoint', 'Workload density', 'Facility tier'],
  },
  itLoadKw: {
    key: 'itLoadKw',
    label: 'IT load',
    unit: ' kW',
    precision: 0,
    lowerIsBetter: false,
    overlay: 'power',
    derivation: 'design capacity x workload density.',
    inputs: ['Design capacity (kW)', 'Workload density'],
  },
  gpuUtilization: {
    key: 'gpuUtilization',
    label: 'GPU utilisation',
    unit: '%',
    precision: 0,
    lowerIsBetter: false,
    overlay: 'gpu',
    derivation: 'workload density adjusted by the applied GPU power cap.',
    inputs: ['Workload density', 'GPU power cap'],
  },
  thermalStability: {
    key: 'thermalStability',
    label: 'Thermal stability',
    unit: '%',
    precision: 0,
    lowerIsBetter: false,
    overlay: 'thermal',
    derivation: 'inverse of modelled hotspot pressure across all rack rows.',
    inputs: ['Cooling setpoint', 'Workload density', 'Rack count'],
  },
  coolingEfficiency: {
    key: 'coolingEfficiency',
    label: 'Cooling efficiency',
    unit: '%',
    precision: 0,
    lowerIsBetter: false,
    overlay: 'cooling',
    derivation: 'modelled cooling delivered per unit of cooling power at the current setpoint.',
    inputs: ['Cooling setpoint', 'Facility tier'],
  },
  capacityHeadroom: {
    key: 'capacityHeadroom',
    label: 'Capacity headroom',
    unit: '%',
    precision: 0,
    lowerIsBetter: false,
    overlay: 'workload',
    derivation: '100 minus modelled workload density against design capacity.',
    inputs: ['Design capacity (kW)', 'Workload density'],
  },
  carbonIntensity: {
    key: 'carbonIntensity',
    label: 'Carbon intensity',
    unit: ' gCO2e/kWh',
    precision: 0,
    lowerIsBetter: true,
    overlay: 'carbon',
    derivation: 'configured grid intensity scaled by the modelled renewable mix.',
    inputs: ['Grid carbon intensity', 'Renewable mix'],
  },
  energyCostPerMwh: {
    key: 'energyCostPerMwh',
    label: 'Energy cost',
    unit: ' /MWh',
    precision: 0,
    lowerIsBetter: true,
    overlay: 'power',
    derivation: 'regional tariff band scaled by modelled PUE.',
    inputs: ['Region', 'PUE'],
  },
  sovereigntyScore: {
    key: 'sovereigntyScore',
    label: 'Sovereignty posture',
    unit: '%',
    precision: 0,
    lowerIsBetter: false,
    overlay: 'sovereignty',
    derivation: 'configured sovereignty level and residency region mapped to the applicable control set.',
    inputs: ['Sovereignty level', 'Region code'],
  },
};

export type KpiValues = Record<KpiKey, number>;

const TIER_FACTOR: Record<string, number> = {
  'tier-i': 1.06,
  'tier-ii': 1.03,
  'tier-iii': 1.0,
  'tier-iv': 0.98,
};

function tierFactor(tier: string): number {
  return TIER_FACTOR[tier?.toLowerCase().replace(/\s+/g, '-')] ?? 1.0;
}

/** Pure KPI derivation. Same facility + overrides always yields the same values. */
export function deriveKpis(facility: FacilityDefinition, overrides: ConfigOverrides): KpiValues {
  const density = overrides.workloadDensityPct / 100;
  const cap = overrides.gpuPowerCapPct / 100;
  const setpointDelta = overrides.coolingSetpointC - DEFAULT_OVERRIDES.coolingSetpointC;

  const itLoadKw = facility.capacityKw * density * cap;
  const coolingEfficiency = clamp(78 + setpointDelta * 2.4 - (tierFactor(facility.tier) - 1) * 40, 45, 96);
  const pue = clamp(
    facility.pueTarget * tierFactor(facility.tier) + (0.9 - density) * 0.12 - setpointDelta * 0.012,
    1.02,
    2.2,
  );
  const thermalStability = clamp(97 - Math.max(0, setpointDelta) * 3.1 - Math.max(0, density - 0.75) * 60, 40, 99);
  const gpuUtilization = clamp(density * 100 * (0.6 + 0.4 * cap), 0, 100);
  const capacityHeadroom = clamp(100 - density * 100, 0, 100);
  const carbonIntensity = Math.max(4, facility.carbonIntensity * (1 - overrides.renewableMixPct / 100));
  const energyCostPerMwh = clamp(58 * pue, 30, 400);
  const sovereigntyScore = sovereigntyPosture(facility);

  return {
    pue,
    itLoadKw,
    gpuUtilization,
    thermalStability,
    coolingEfficiency,
    capacityHeadroom,
    carbonIntensity,
    energyCostPerMwh,
    sovereigntyScore,
  };
}

function sovereigntyPosture(facility: FacilityDefinition): number {
  const level = (facility.sovereigntyLevel || 'standard').toLowerCase();
  const base = level.includes('sovereign') ? 92 : level.includes('restricted') ? 84 : 74;
  const regional = facility.regionCode?.toUpperCase().startsWith('CA') ? 6 : 0;
  return clamp(base + regional, 0, 100);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function formatKpi(key: KpiKey, value: number): string {
  const d = KPI_DESCRIPTORS[key];
  if (key === 'itLoadKw') return formatPower(value);
  return `${value.toFixed(d.precision)}${d.unit}`;
}

/** Deterministic asset tree derived from the facility definition. */
export function buildAssets(facility: FacilityDefinition): FacilityAsset[] {
  const rng = seededRandom(facility.id || facility.name);
  const assets: FacilityAsset[] = [
    {
      id: 'facility',
      name: facility.name,
      kind: 'facility',
      subsystem: 'Facility',
      dependencies: [],
      attributes: [
        { label: 'Location', value: `${facility.city} (${facility.regionCode})` },
        { label: 'Tier', value: facility.tier },
        { label: 'Design capacity', value: formatPower(facility.capacityKw) },
        {
          label: 'Racks modelled',
          value:
            facility.designRackEstimate > facility.rackCount
              ? `${facility.rackCount} of ~${facility.designRackEstimate}`
              : String(facility.rackCount),
        },
      ],
    },
  ];

  for (let r = 0; r < facility.rowCount; r += 1) {
    const rowLetter = String.fromCharCode(65 + r);
    assets.push({
      id: `row-${r + 1}`,
      name: `Row ${rowLetter}`,
      kind: 'row',
      subsystem: 'Whitespace',
      dependencies: ['facility', `cooling-${(r % 2) + 1}`],
      attributes: [
        { label: 'Aisle', value: r % 2 === 1 ? 'Hot aisle' : 'Cold aisle' },
        { label: 'Racks', value: String(Math.ceil(facility.rackCount / facility.rowCount)) },
      ],
    });
  }

  const perRow = Math.ceil(facility.rackCount / facility.rowCount);
  for (let r = 0; r < facility.rowCount; r += 1) {
    for (let i = 0; i < perRow; i += 1) {
      const id = `rack-${r + 1}-${i + 1}`;
      const util = 40 + rng() * 50;
      const temp = 20 + rng() * 10;
      assets.push({
        id,
        name: `Rack ${String.fromCharCode(65 + r)}${i + 1}`,
        kind: 'rack',
        subsystem: 'Compute',
        dependencies: [`row-${r + 1}`, `power-${(i % 2) + 1}`],
        attributes: [
          { label: 'Modelled utilisation', value: `${util.toFixed(0)}%` },
          { label: 'Modelled inlet temp', value: `${temp.toFixed(1)} C` },
          { label: 'Height', value: '42U' },
        ],
      });
    }
  }

  assets.push(
    {
      id: 'power-1',
      name: 'Power train A',
      kind: 'power',
      subsystem: 'Power',
      dependencies: ['facility'],
      attributes: [
        { label: 'Topology', value: '2N' },
        { label: 'Modelled load', value: formatPower(facility.capacityKw * 0.42) },
      ],
    },
    {
      id: 'power-2',
      name: 'Power train B',
      kind: 'power',
      subsystem: 'Power',
      dependencies: ['facility'],
      attributes: [
        { label: 'Topology', value: '2N' },
        { label: 'Modelled load', value: formatPower(facility.capacityKw * 0.4) },
      ],
    },
    {
      id: 'cooling-1',
      name: 'Cooling loop 1',
      kind: 'cooling',
      subsystem: 'Cooling',
      dependencies: ['power-1'],
      attributes: [
        { label: 'Type', value: 'Liquid to chip' },
        { label: 'Design setpoint', value: `${DEFAULT_OVERRIDES.coolingSetpointC} C` },
      ],
    },
    {
      id: 'cooling-2',
      name: 'Cooling loop 2',
      kind: 'cooling',
      subsystem: 'Cooling',
      dependencies: ['power-2'],
      attributes: [
        { label: 'Type', value: 'Air containment' },
        { label: 'Design setpoint', value: `${DEFAULT_OVERRIDES.coolingSetpointC + 2} C` },
      ],
    },
    {
      id: 'network-core',
      name: 'Core fabric',
      kind: 'network',
      subsystem: 'Network',
      dependencies: ['facility'],
      attributes: [
        { label: 'Topology', value: 'Spine and leaf' },
        { label: 'Modelled oversubscription', value: '1:1.2' },
      ],
    },
  );

  return assets;
}

const FALLBACK_FACILITY: FacilityDefinition = {
  id: 'aura-reference-facility',
  name: 'AURA reference facility',
  city: 'Montreal',
  regionCode: 'CA-QC',
  tier: 'Tier-III',
  capacityKw: 4200,
  rackCount: 24,
  rowCount: 3,
  designRackEstimate: 24,
  pueTarget: 1.28,
  renewableTargetPct: 85,
  carbonIntensity: 32,
  sovereigntyLevel: 'sovereign',
  industry: 'AI infrastructure',
};

export interface FacilityModel {
  facility: FacilityDefinition;
  assets: FacilityAsset[];
  isFallback: boolean;
  isLoading: boolean;
  naming: FacilityNamingContext;
  /**
   * Disclosure emitted when the stored capacity had to be rescaled, or when
   * the rendered rack count is a subset of the design estimate.
   */
  modelNotes: string[];
}

/**
 * Facility identity supplied by a route that is authoritative over the active
 * twin. `/blueprint/:id` renders `:id`, which is not always the active twin, so
 * the model must be built from the routed record or the page would show two
 * different capacities for one facility.
 */
export interface FacilityOverride {
  id?: string;
  name?: string;
  city?: string;
  regionCode?: string;
  tier?: string;
  capacityKw?: number;
}

/** Single hook every workspace surface uses to read the facility model. */
export function useFacilityModel(override?: FacilityOverride): FacilityModel {
  const { twin, isLoading } = useActiveTwin();
  const overrideKey = override ? JSON.stringify(override) : '';

  return useMemo(() => {
    // The routed record wins over the active twin whenever the two differ.
    const source = override?.id && override.id !== twin?.id ? null : twin;

    if (!source && !override) {
      const naming = resolveFacilityNaming(FALLBACK_FACILITY);
      return {
        facility: FALLBACK_FACILITY,
        assets: buildAssets(FALLBACK_FACILITY),
        isFallback: true,
        isLoading,
      modelNotes: [],
        naming: {
          classification: naming.classification,
          breadcrumb: naming.breadcrumb,
          isDerivedName: false,
          storedName: FALLBACK_FACILITY.name,
        },
      };
    }
    const capacity = normaliseStoredCapacityKw(
      override?.capacityKw ?? source?.capacity_kw,
      FALLBACK_FACILITY.capacityKw,
    );
    const capacityKw = capacity.kw;
    const designRackEstimate = Math.max(8, Math.floor(capacityKw / 50));
    const rackCount = Math.min(40, designRackEstimate);
    const rowCount = Math.max(1, Math.ceil(rackCount / 8));
    const modelNotes: string[] = [];
    if (capacity.note) modelNotes.push(capacity.note);
    if (designRackEstimate > rackCount) {
      modelNotes.push(
        `${rackCount} of an estimated ${designRackEstimate} racks are rendered. The remainder are represented by the aggregate load model.`,
      );
    }
    const city = override?.city || source?.city || FALLBACK_FACILITY.city;
    const regionCode = override?.regionCode || source?.region_code || FALLBACK_FACILITY.regionCode;
    const tier = override?.tier || source?.tier || FALLBACK_FACILITY.tier;
    const naming = resolveFacilityNaming({
      name: override?.name || source?.name || FALLBACK_FACILITY.name,
      city,
      regionCode,
      tier,
      sovereigntyLevel: source?.sovereignty_level ?? FALLBACK_FACILITY.sovereigntyLevel,
      industry: source?.industry ?? FALLBACK_FACILITY.industry,
    });
    const facility: FacilityDefinition = {
      id: override?.id ?? source?.id ?? FALLBACK_FACILITY.id,
      name: naming.displayName,
      city,
      regionCode,
      tier,
      capacityKw,
      rackCount,
      rowCount,
      designRackEstimate,
      pueTarget: source?.pue_target ?? FALLBACK_FACILITY.pueTarget,
      renewableTargetPct: source?.renewable_target_pct ?? FALLBACK_FACILITY.renewableTargetPct,
      carbonIntensity: source?.carbon_intensity ?? FALLBACK_FACILITY.carbonIntensity,
      sovereigntyLevel: source?.sovereignty_level ?? FALLBACK_FACILITY.sovereigntyLevel,
      industry: source?.industry ?? FALLBACK_FACILITY.industry,
    };
    return {
      facility,
      assets: buildAssets(facility),
      isFallback: !source && !override,
      isLoading,
      modelNotes,
      naming: {
        classification: naming.classification,
        breadcrumb: naming.breadcrumb,
        isDerivedName: naming.isDerivedName,
        storedName: naming.storedName,
      },
    };
    // `overrideKey` is the serialized override; depending on it keeps the memo
    // stable when callers pass a fresh object literal each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twin, isLoading, overrideKey]);
}
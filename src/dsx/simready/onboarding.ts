/**
 * SimReady asset-onboarding boundary.
 *
 * An asset is only usable for simulation once it carries the metadata the
 * physics/thermal calculators actually read. This module states those
 * requirements explicitly and reports gaps instead of defaulting them.
 *
 * No value is ever invented: a missing rating is a BLOCKER, not a zero.
 */
import type { AssetClass } from '../contracts/assetMapping';
import type { FixtureAsset } from '../fixtures/evidenceBetaFacility';

export const ONBOARDING_STATES = [
  'unregistered',
  'metadata_incomplete',
  'awaiting_approval',
  'simready',
  'rejected',
] as const;
export type OnboardingState = (typeof ONBOARDING_STATES)[number];

export type GapSeverity = 'blocker' | 'advisory';

export interface OnboardingGap {
  field: string;
  severity: GapSeverity;
  detail: string;
}

export interface OnboardingAssessment {
  aura_asset_id: string;
  source_asset_id: string;
  asset_class: AssetClass;
  state: OnboardingState;
  gaps: OnboardingGap[];
  /** Fraction of required fields present, 0..1. Reported, never rounded up. */
  completeness: number;
  /** True only when the asset may drive a simulation input. */
  simulation_eligible: boolean;
}

/** Required metadata per asset class, keyed to what the KPI engine reads. */
const REQUIRED_FIELDS: Record<AssetClass, Array<keyof FixtureAsset>> = {
  site: ['rated_kw'],
  data_hall: ['rated_kw', 'design_inlet_c'],
  rack: ['rated_kw', 'design_inlet_c', 'manufacturer', 'model'],
  cooling_unit: ['rated_kw', 'design_inlet_c', 'manufacturer', 'model'],
  cdu: ['rated_kw', 'manufacturer', 'model'],
  ups: ['rated_kw', 'manufacturer', 'model'],
  rpp: ['rated_kw', 'manufacturer', 'model'],
  sensor: ['manufacturer', 'model'],
};

/** Classes whose geometry must be SimReady before simulation eligibility. */
const GEOMETRY_REQUIRED: ReadonlySet<AssetClass> = new Set<AssetClass>([
  'rack',
  'cooling_unit',
  'cdu',
]);

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === 'n/a';
}

export function assessAsset(asset: FixtureAsset): OnboardingAssessment {
  const required = REQUIRED_FIELDS[asset.asset_class] ?? [];
  const gaps: OnboardingGap[] = [];

  for (const field of required) {
    if (isMissing(asset[field])) {
      gaps.push({
        field: String(field),
        severity: 'blocker',
        detail: `${String(field)} is required for ${asset.asset_class} simulation inputs and is absent.`,
      });
    }
  }

  if (GEOMETRY_REQUIRED.has(asset.asset_class) && asset.simready !== true) {
    gaps.push({
      field: 'simready',
      severity: 'blocker',
      detail: 'No SimReady geometry/material definition is attached to this asset.',
    });
  }

  if (isMissing(asset.usd_prim_path)) {
    gaps.push({
      field: 'usd_prim_path',
      severity: 'blocker',
      detail: 'Asset has no OpenUSD prim path and cannot be located in a stage.',
    });
  }

  if (asset.connection_points.length === 0 && asset.asset_class !== 'site') {
    gaps.push({
      field: 'connection_points',
      severity: 'advisory',
      detail: 'No topology connections declared; dependency analysis will be incomplete.',
    });
  }

  const present = required.filter((f) => !isMissing(asset[f])).length;
  const completeness = required.length === 0 ? 1 : present / required.length;

  const blockers = gaps.filter((g) => g.severity === 'blocker');
  let state: OnboardingState;
  if (asset.approval_status === 'draft') state = 'unregistered';
  else if (blockers.length > 0) state = 'metadata_incomplete';
  else if (asset.approval_status !== 'approved') state = 'awaiting_approval';
  else state = 'simready';

  return {
    aura_asset_id: asset.aura_asset_id,
    source_asset_id: asset.source_asset_id,
    asset_class: asset.asset_class,
    state,
    gaps,
    completeness,
    simulation_eligible: state === 'simready',
  };
}

export interface OnboardingSummary {
  total: number;
  by_state: Record<OnboardingState, number>;
  simulation_eligible: number;
  blocked: OnboardingAssessment[];
}

export function assessFleet(assets: readonly FixtureAsset[]): OnboardingSummary {
  const assessments = assets.map(assessAsset);
  const by_state = ONBOARDING_STATES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<OnboardingState, number>,
  );
  for (const a of assessments) by_state[a.state] += 1;
  return {
    total: assessments.length,
    by_state,
    simulation_eligible: assessments.filter((a) => a.simulation_eligible).length,
    blocked: assessments.filter((a) => !a.simulation_eligible),
  };
}
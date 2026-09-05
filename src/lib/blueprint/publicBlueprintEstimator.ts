/**
 * Public blueprint estimator (marketing surface).
 *
 * Deterministic, client-side design-time model. Every number produced here is
 * SIMULATED OUTPUT derived from the visitor's own inputs and the documented
 * assumptions below. It is not measured telemetry, and it does not read from
 * any facility, tenant, or backend data source.
 *
 * Assumption sources (design-time reference values, not vendor claims):
 * - Grid carbon intensity / renewable share: REGIONAL_CARBON_INTENSITY
 *   (see src/engines/carbon/types.ts for the underlying published sources).
 * - Cooling-topology PUE baselines: ASHRAE TC 9.9 thermal guidelines and
 *   Uptime Institute Global Data Center Survey PUE distributions.
 * - Greenfield CAPEX per MW: JLL / Cushman & Wakefield data-centre outlooks.
 * - Carbon price default: Canada federal backstop (CAD 80/tonne, 2024).
 */
import { CarbonEngine } from '@/engines/carbon';
import { REGIONAL_CARBON_INTENSITY } from '@/engines/carbon/types';

export type CoolingTopology = 'air' | 'rear-door' | 'direct-liquid' | 'immersion';
export type ClimateBand = 'cold' | 'temperate' | 'hot';

export interface BlueprintEstimatorInput {
  /** Design IT load in megawatts (nameplate IT, excluding facility overhead). */
  itLoadMw: number;
  /** Average designed rack density in kW. */
  rackDensityKw: number;
  /** Expected sustained IT utilisation, 0-100. */
  utilisationPct: number;
  coolingTopology: CoolingTopology;
  climate: ClimateBand;
  /** Grid region key from the carbon intensity reference table. */
  region: string;
  /** Delivered electricity price per kWh, in the visitor's currency. */
  electricityPricePerKwh: number;
  /** Carbon price per tonne CO2e, in the visitor's currency. */
  carbonPricePerTonne: number;
  /** Greenfield build cost per MW of IT load. */
  capexPerMw: number;
  /** Amortisation period for the build, in years. */
  amortisationYears: number;
}

export interface BlueprintEstimatorResult {
  pue: number;
  pueContributions: { label: string; value: number }[];
  itLoadKw: number;
  facilityLoadKw: number;
  annualItMwh: number;
  annualFacilityMwh: number;
  gridIntensityGPerKwh: number;
  gridRenewablePct: number;
  annualTonnesCo2e: number;
  tonnesPerMwOfIt: number;
  annualEnergyCost: number;
  annualCarbonCost: number;
  annualMaintenanceCost: number;
  annualAmortisedCapex: number;
  annualTotalCost: number;
  costPerItMwh: number;
  /** Delta against a conventional air-cooled reference design at PUE 1.58. */
  baselinePue: number;
  annualEnergySavedMwh: number;
  annualCostSaved: number;
  annualTonnesSaved: number;
}

/** Cooling topology PUE baselines at reference conditions. */
const COOLING_BASE_PUE: Record<CoolingTopology, number> = {
  air: 1.5,
  'rear-door': 1.34,
  'direct-liquid': 1.18,
  immersion: 1.08,
};

/** Density (kW/rack) beyond which each topology loses efficiency. */
const DENSITY_COMFORT_KW: Record<CoolingTopology, number> = {
  air: 15,
  'rear-door': 40,
  'direct-liquid': 80,
  immersion: 120,
};

const CLIMATE_PUE_DELTA: Record<ClimateBand, number> = {
  cold: -0.05,
  temperate: 0,
  hot: 0.07,
};

/** Conventional air-cooled reference design used for the comparison band. */
export const BASELINE_REFERENCE_PUE = 1.58;
/** Annual maintenance as a share of CAPEX (Uptime Institute benchmark). */
export const MAINTENANCE_CAPEX_PCT = 0.025;

export const REGION_KEYS = Object.keys(REGIONAL_CARBON_INTENSITY);

export const ESTIMATOR_DEFAULTS: BlueprintEstimatorInput = {
  itLoadMw: 5,
  rackDensityKw: 45,
  utilisationPct: 70,
  coolingTopology: 'direct-liquid',
  climate: 'cold',
  region: 'CA-QC',
  electricityPricePerKwh: 0.055,
  carbonPricePerTonne: 80,
  capexPerMw: 12_000_000,
  amortisationYears: 15,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Estimate PUE from the design inputs. Returns the value plus each additive
 * contribution so the report can show its own arithmetic.
 */
export function estimatePue(input: BlueprintEstimatorInput): {
  pue: number;
  contributions: { label: string; value: number }[];
} {
  const base = COOLING_BASE_PUE[input.coolingTopology];
  const climate = CLIMATE_PUE_DELTA[input.climate];

  const comfort = DENSITY_COMFORT_KW[input.coolingTopology];
  const overDensity = Math.max(0, input.rackDensityKw - comfort);
  // Air paths degrade fastest past their comfort density; liquid paths barely move.
  const densityRate = input.coolingTopology === 'air' ? 0.006 : 0.0015;
  const density = round(overDensity * densityRate, 3);

  // Fixed facility overhead is amortised across less IT load at low utilisation.
  const utilisation = round((1 - clamp(input.utilisationPct, 5, 100) / 100) * 0.16, 3);

  const pue = clamp(base + climate + density + utilisation, 1.03, 2.5);

  return {
    pue: round(pue, 3),
    contributions: [
      { label: 'cooling', value: round(base, 3) },
      { label: 'climate', value: climate },
      { label: 'density', value: density },
      { label: 'utilisation', value: utilisation },
    ],
  };
}

export function runBlueprintEstimate(input: BlueprintEstimatorInput): BlueprintEstimatorResult {
  const { pue, contributions } = estimatePue(input);

  const feed = CarbonEngine.getRegionalIntensity(input.region);
  const utilisation = clamp(input.utilisationPct, 0, 100) / 100;

  const itLoadKw = Math.max(0, input.itLoadMw) * 1000 * utilisation;
  const facilityLoadKw = itLoadKw * pue;

  const annualItMwh = (itLoadKw * 8760) / 1000;
  const annualFacilityMwh = (facilityLoadKw * 8760) / 1000;

  // Location-based Scope 2. Renewable mix is reported separately rather than
  // netted off, so the grid factor is never double-counted.
  const carbon = CarbonEngine.evaluate({
    pue,
    powerKwh: itLoadKw,
    carbonIntensityGPerKwh: feed.carbonIntensityGPerKwh,
    renewableMixPct: 0,
    activeGpuCount: 0,
  });

  const annualTonnesCo2e = carbon.projectedAnnualEmissionsTons;

  const annualEnergyCost = annualFacilityMwh * 1000 * input.electricityPricePerKwh;
  const annualCarbonCost = annualTonnesCo2e * input.carbonPricePerTonne;
  const capex = Math.max(0, input.itLoadMw) * input.capexPerMw;
  const annualMaintenanceCost = capex * MAINTENANCE_CAPEX_PCT;
  const annualAmortisedCapex = input.amortisationYears > 0 ? capex / input.amortisationYears : 0;
  const annualTotalCost =
    annualEnergyCost + annualCarbonCost + annualMaintenanceCost + annualAmortisedCapex;

  const baselineFacilityMwh = (itLoadKw * BASELINE_REFERENCE_PUE * 8760) / 1000;
  const annualEnergySavedMwh = baselineFacilityMwh - annualFacilityMwh;
  const annualCostSaved = annualEnergySavedMwh * 1000 * input.electricityPricePerKwh;
  const annualTonnesSaved = (annualEnergySavedMwh * 1000 * feed.carbonIntensityGPerKwh) / 1_000_000;

  return {
    pue,
    pueContributions: contributions,
    itLoadKw: round(itLoadKw, 1),
    facilityLoadKw: round(facilityLoadKw, 1),
    annualItMwh: round(annualItMwh, 1),
    annualFacilityMwh: round(annualFacilityMwh, 1),
    gridIntensityGPerKwh: feed.carbonIntensityGPerKwh,
    gridRenewablePct: feed.renewablePercentage,
    annualTonnesCo2e: round(annualTonnesCo2e, 1),
    tonnesPerMwOfIt: input.itLoadMw > 0 ? round(annualTonnesCo2e / input.itLoadMw, 1) : 0,
    annualEnergyCost: round(annualEnergyCost, 0),
    annualCarbonCost: round(annualCarbonCost, 0),
    annualMaintenanceCost: round(annualMaintenanceCost, 0),
    annualAmortisedCapex: round(annualAmortisedCapex, 0),
    annualTotalCost: round(annualTotalCost, 0),
    costPerItMwh: annualItMwh > 0 ? round(annualTotalCost / annualItMwh, 2) : 0,
    baselinePue: BASELINE_REFERENCE_PUE,
    annualEnergySavedMwh: round(annualEnergySavedMwh, 1),
    annualCostSaved: round(annualCostSaved, 0),
    annualTonnesSaved: round(annualTonnesSaved, 1),
  };
}

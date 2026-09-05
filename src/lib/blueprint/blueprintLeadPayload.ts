/**
 * Builds the public-intake payloads for a blueprint estimator submission.
 *
 * A submission is routed through the same server-controlled public intake used
 * by sign-up onboarding, so an estimator visitor becomes a real lead record.
 * Every derived figure is explicitly labelled as simulated design-time output;
 * nothing here is measured telemetry.
 */
import type {
  BlueprintEstimatorInput,
  BlueprintEstimatorResult,
} from './publicBlueprintEstimator';
import type { ScenarioRunResult } from './publicScenarioRun';

export interface BlueprintLeadContact {
  full_name: string;
  email: string;
  job_title: string;
  company_name: string;
  company_size: string;
  timeline: string;
  /** Honeypot: must remain empty for a human submission. */
  company_website?: string;
}

export interface BlueprintLeadPayloads {
  onboarding: Record<string, unknown>;
  contact: Record<string, unknown>;
}

const CHALLENGE_MAX = 2000;
const MESSAGE_MAX = 4000;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Racks implied by the entered IT load and rack density. */
export function deriveRackCount(input: BlueprintEstimatorInput): number {
  if (!Number.isFinite(input.rackDensityKw) || input.rackDensityKw <= 0) return 0;
  return Math.max(1, Math.ceil((input.itLoadMw * 1000) / input.rackDensityKw));
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Human-readable, provenance-labelled summary of the estimator session. */
export function buildBlueprintLeadSummary(
  input: BlueprintEstimatorInput,
  report: BlueprintEstimatorResult,
  run: ScenarioRunResult | null,
): string {
  const lines: string[] = [
    'SIMULATED DESIGN-TIME OUTPUT - public blueprint estimator (not measured telemetry).',
    '',
    'Design spec:',
    `- IT load: ${round(input.itLoadMw, 3)} MW`,
    `- Rack density: ${round(input.rackDensityKw, 1)} kW/rack (${deriveRackCount(input)} racks implied)`,
    `- Utilisation: ${round(input.utilisationPct, 1)}%`,
    `- Cooling topology: ${input.coolingTopology}`,
    `- Climate band: ${input.climate}`,
    `- Grid region: ${input.region}`,
    `- Electricity price: ${round(input.electricityPricePerKwh, 4)} /kWh`,
    `- Carbon price: ${round(input.carbonPricePerTonne, 2)} /tCO2e`,
    `- Capex: ${round(input.capexPerMw, 0)} /MW over ${round(input.amortisationYears, 0)} years`,
    '',
    'Modelled report:',
    `- PUE: ${round(report.pue, 3)} (air-cooled reference ${round(report.baselinePue, 3)})`,
    `- Annual facility energy: ${round(report.annualFacilityMwh, 0)} MWh`,
    `- Annual Scope 2 carbon: ${round(report.annualTonnesCo2e, 1)} tCO2e`,
    `- Annual total cost: ${round(report.annualTotalCost, 0)}`,
    `- Cost per IT MWh: ${round(report.costPerItMwh, 2)}`,
  ];

  if (run) {
    lines.push(
      '',
      `Scenario run: ${run.scenarioName} (${run.scenarioId}, ${run.durationSeconds}s simulated)`,
      `- Peak PUE: ${round(run.peakPue, 3)}`,
      `- Peak overhead: ${round(run.peakOverheadKw, 1)} kW`,
      `- Peak overhead cost: ${round(run.peakOverheadCostPerHour, 2)} /h`,
      `- Lowest thermal stability: ${round(run.lowestThermalStability, 1)}`,
      `- Critical events: ${run.criticalEventCount}`,
    );
  } else {
    lines.push('', 'Scenario run: none executed before submission.');
  }

  return lines.join('\n');
}

/**
 * Maps an estimator session onto the onboarding intake record plus a contact
 * record carrying the full simulated report.
 */
export function buildBlueprintLeadPayloads(
  contact: BlueprintLeadContact,
  input: BlueprintEstimatorInput,
  report: BlueprintEstimatorResult,
  run: ScenarioRunResult | null,
): BlueprintLeadPayloads {
  const summary = buildBlueprintLeadSummary(input, report, run);
  const honeypot = contact.company_website ?? '';

  const goals = ['Blueprint estimator report'];
  if (run) goals.push(`Scenario: ${run.scenarioName}`);

  return {
    onboarding: {
      kind: 'onboarding',
      full_name: contact.full_name,
      email: contact.email,
      job_title: contact.job_title,
      company_name: contact.company_name,
      company_size: contact.company_size,
      num_data_centres: '1',
      rack_count: String(deriveRackCount(input)),
      workload_types: [
        `cooling:${input.coolingTopology}`,
        `climate:${input.climate}`,
        `region:${input.region}`,
      ],
      current_pue: report.pue.toFixed(3),
      goals,
      challenge: truncate(summary, CHALLENGE_MAX),
      timeline: contact.timeline,
      company_website: honeypot,
    },
    contact: {
      kind: 'contact',
      name: contact.full_name,
      email: contact.email,
      message: truncate(summary, MESSAGE_MAX),
      company_website: honeypot,
    },
  };
}

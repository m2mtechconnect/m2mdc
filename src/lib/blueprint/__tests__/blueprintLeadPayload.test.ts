import { describe, expect, it } from 'vitest';
import {
  buildBlueprintLeadPayloads,
  buildBlueprintLeadSummary,
  deriveRackCount,
} from '../blueprintLeadPayload';
import { ESTIMATOR_DEFAULTS, runBlueprintEstimate } from '../publicBlueprintEstimator';
import { PUBLIC_SCENARIO_IDS, runPublicScenario } from '../publicScenarioRun';

const report = runBlueprintEstimate(ESTIMATOR_DEFAULTS);
const contact = {
  full_name: 'Alex Tremblay',
  email: 'alex@example.com',
  job_title: 'Data Centre Manager',
  company_name: 'Northern Compute',
  company_size: '51-200',
  timeline: '1-3 months',
};

describe('deriveRackCount', () => {
  it('derives racks from IT load and density', () => {
    expect(deriveRackCount({ ...ESTIMATOR_DEFAULTS, itLoadMw: 5, rackDensityKw: 50 })).toBe(100);
  });

  it('never returns a non-finite or zero count', () => {
    expect(deriveRackCount({ ...ESTIMATOR_DEFAULTS, rackDensityKw: 0 })).toBe(0);
    expect(deriveRackCount({ ...ESTIMATOR_DEFAULTS, itLoadMw: 0.001, rackDensityKw: 50 })).toBe(1);
  });
});

describe('buildBlueprintLeadSummary', () => {
  it('labels output as simulated and reports the modelled PUE', () => {
    const summary = buildBlueprintLeadSummary(ESTIMATOR_DEFAULTS, report, null);
    expect(summary).toContain('SIMULATED DESIGN-TIME OUTPUT');
    expect(summary).toContain(`PUE: ${report.pue.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`.slice(0, 8));
    expect(summary).toContain('Scenario run: none executed');
  });

  it('includes scenario results when a run exists', () => {
    const run = runPublicScenario(PUBLIC_SCENARIO_IDS[1], ESTIMATOR_DEFAULTS, report);
    expect(run).not.toBeNull();
    const summary = buildBlueprintLeadSummary(ESTIMATOR_DEFAULTS, report, run);
    expect(summary).toContain('Peak PUE');
    expect(summary).toContain(run!.scenarioId);
  });
});

describe('buildBlueprintLeadPayloads', () => {
  it('produces an onboarding record within intake field limits', () => {
    const run = runPublicScenario(PUBLIC_SCENARIO_IDS[0], ESTIMATOR_DEFAULTS, report);
    const { onboarding, contact: contactPayload } = buildBlueprintLeadPayloads(
      contact,
      ESTIMATOR_DEFAULTS,
      report,
      run,
    );

    expect(onboarding.kind).toBe('onboarding');
    expect(onboarding.email).toBe('alex@example.com');
    expect(onboarding.num_data_centres).toBe('1');
    expect(onboarding.rack_count).toBe(String(deriveRackCount(ESTIMATOR_DEFAULTS)));
    expect((onboarding.workload_types as string[]).length).toBe(3);
    expect((onboarding.goals as string[])[0]).toBe('Blueprint estimator report');
    expect(String(onboarding.challenge).length).toBeLessThanOrEqual(2000);
    expect(onboarding.company_website).toBe('');

    expect(contactPayload.kind).toBe('contact');
    expect(String(contactPayload.message).length).toBeLessThanOrEqual(4000);
  });

  it('forwards a filled honeypot so the server can reject the submission', () => {
    const { onboarding, contact: contactPayload } = buildBlueprintLeadPayloads(
      { ...contact, company_website: 'http://spam.example' },
      ESTIMATOR_DEFAULTS,
      report,
      null,
    );
    expect(onboarding.company_website).toBe('http://spam.example');
    expect(contactPayload.company_website).toBe('http://spam.example');
  });
});

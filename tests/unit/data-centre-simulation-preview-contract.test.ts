/**
 * Contract: the Builder Step 5 simulation preview must never fall back to the
 * generic ITIL fixture for data centre / AI compute builds, and the data
 * centre sample scenarios must remain provider-neutral.
 */
import { describe, it, expect } from 'vitest';
import {
  getSimulationTemplateForIndustry,
  getIndustryLabel,
  SIMULATION_TEMPLATES,
} from '@/lib/simulationTemplates';

const DC_INPUTS = [
  'ai_compute',
  'data_centre',
  'data_center',
  'datacenter',
  'datacentre',
  'AI Compute',
  'Colocation',
  'sovereign data centre',
];

const VENDOR_DENYLIST = [
  'nvidia',
  'dgx',
  'omniverse',
  'dsx',
  'superpod',
  'gemini',
  'openai',
  'jetson',
];

describe('data centre simulation preview templates', () => {
  it('registers dedicated data centre templates', () => {
    expect(SIMULATION_TEMPLATES.data_centre).toBeDefined();
    expect(SIMULATION_TEMPLATES.ai_compute).toBeDefined();
  });

  it('never resolves data centre industries to the generic ITIL fixture', () => {
    for (const input of DC_INPUTS) {
      const template = getSimulationTemplateForIndustry(input);
      expect(template.industry, input).not.toBe('generic');
      expect(['ai_compute', 'data_centre']).toContain(template.industry);
      expect(JSON.stringify(template).toLowerCase()).not.toContain('itil');
    }
  });

  it('exposes data centre KPI vocabulary rather than service-desk KPIs', () => {
    for (const key of ['data_centre', 'ai_compute'] as const) {
      const codes = SIMULATION_TEMPLATES[key].kpis.map((k) => k.code);
      expect(codes).toContain('pue');
      expect(codes).not.toContain('mttr');
      expect(codes).not.toContain('first_call_resolution');
    }
  });

  it('keeps the data centre samples provider-neutral', () => {
    for (const key of ['data_centre', 'ai_compute'] as const) {
      const blob = JSON.stringify(SIMULATION_TEMPLATES[key]).toLowerCase();
      for (const vendor of VENDOR_DENYLIST) {
        expect(blob, `${key} mentions ${vendor}`).not.toContain(vendor);
      }
    }
  });

  it('labels the data centre industries explicitly', () => {
    expect(getIndustryLabel('data_centre')).toBe('Data Centre');
    expect(getIndustryLabel('ai_compute')).toBe('AI Compute Data Centre');
  });
});

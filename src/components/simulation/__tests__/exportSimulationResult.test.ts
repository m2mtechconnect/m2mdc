/**
 * Phase 1A.3.d.1 — SimulationResultPanel export contract.
 *
 * These tests PARSE the canonical JSON and Markdown outputs to prove:
 *   1. Scenario metadata rows are `static`.
 *   2. Baseline (before) rows are `demo` and post-scenario (after) rows
 *      are `simulated`.
 *   3. NO row is ever `live`, regardless of what an estimator supplies.
 *   4. Payload envelope carries schemaVersion, surface, generatedAt,
 *      and scenario ID is in the surface.
 *   5. Unit and source columns are populated per record.
 */

import { describe, it, expect } from 'vitest';
import { toJson, toMarkdown } from '@/lib/provenance/exporters';
import { buildSimulationResultPayload } from '../exportSimulationResult';
import type { SimulationResultSummary } from '@/simulation/types';

const result: SimulationResultSummary = {
  scenarioId: 'thermal-runaway',
  scenarioName: 'Thermal Runaway',
  durationSec: 120,
  events: [{ id: 'e1', timestamp: 0, type: 'ALERT', domain: 'thermal', severity: 'high', title: 't', description: 'd' } as any],
  kpiDeltas: [
    { id: 'pue', label: 'PUE', unit: '', before: 1.4, after: 1.55, trend: 'up', isGood: false },
    { id: 'thermal', label: 'Avg inlet temp', unit: '°C', before: 22, after: 27, trend: 'up', isGood: false },
  ],
  rcaMarkdown: '## RCA\nHot aisle overload.',
  recommendationsMarkdown: '## Actions\nIncrease CRAH flow.',
  actualVsExpected: [],
};

describe('buildSimulationResultPayload — classification', () => {
  it('scenario metadata rows are static, KPI before rows are demo, KPI after rows are simulated', () => {
    const { payload } = buildSimulationResultPayload(result, { now: new Date('2026-07-17T12:00:00.000Z') });
    const byId = Object.fromEntries(payload.records.map(r => [r.metricId, r]));

    // Scenario metadata → static
    for (const id of ['sim.scenario.id', 'sim.scenario.name', 'sim.scenario.duration', 'sim.scenario.event-count']) {
      expect(byId[id], id).toBeDefined();
      expect(byId[id].provenance).toBe('static');
      expect(byId[id].observedAt).toBeNull();
    }

    // KPI before → demo; KPI after → simulated
    expect(byId['sim.kpi.pue.before'].provenance).toBe('demo');
    expect(byId['sim.kpi.pue.after'].provenance).toBe('simulated');
    expect(byId['sim.kpi.thermal.before'].provenance).toBe('demo');
    expect(byId['sim.kpi.thermal.after'].provenance).toBe('simulated');

    // Units + sources populated
    expect(byId['sim.kpi.thermal.after'].unit).toBe('°C');
    expect(byId['sim.kpi.thermal.after'].source).toBe('AURA simulation estimator');
    expect(byId['sim.kpi.pue.before'].source).toBe('AURA baseline fixture');

    // Envelope
    expect(payload.surface).toBe('simulation.result.thermal-runaway');
    expect(payload.generatedAt).toBe('2026-07-17T12:00:00.000Z');
  });

  it('never exports any record as live, even through JSON or Markdown', () => {
    const { payload, narrative } = buildSimulationResultPayload(result);
    const jsonStr = toJson(payload);
    const parsed = JSON.parse(jsonStr) as { records: Array<{ provenance: string }> };
    for (const r of parsed.records) expect(r.provenance).not.toBe('live');

    const md = toMarkdown(payload, { narrative });
    expect(md).not.toMatch(/\| Live \|/);
    expect(md).toMatch(/schemaVersion:/);
    expect(md).toMatch(/simulation.result.thermal-runaway/);
  });

  it('narrative is fenced under Appendix and not treated as a metric row', () => {
    const { payload, narrative } = buildSimulationResultPayload(result);
    const md = toMarkdown(payload, { narrative });
    expect(md).toMatch(/## Appendix/);
    expect(md).toMatch(/### Root cause analysis/);
    // narrative body must not sneak into the metrics table
    const beforeAppendix = md.split('## Appendix')[0];
    expect(beforeAppendix).not.toMatch(/Hot aisle overload/);
  });
});
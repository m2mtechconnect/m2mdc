/**
 * Canonical export payload for `SimulationResultSummary` (Phase 1A.3.d.1).
 *
 * Classification rules (enforced here, verified by tests):
 *   • Scenario metadata (id, name, duration) → `static` provenance
 *     ("user-configured"). These are inputs the user or scenario author
 *     supplied — they are not measurements.
 *   • KPI "before" values → `demo` provenance ("AURA baseline fixture").
 *     These come from the seeded baseline dataset, not from live
 *     telemetry.
 *   • KPI "after" values → `simulated` provenance ("AURA simulation
 *     estimator"). These are estimator output. They are NEVER exported
 *     as `live` — the canonical schema forbids it.
 *
 * Narrative RCA / recommendations are returned separately so the
 * Markdown serializer can attach them under an Appendix without ever
 * treating them as metric values.
 */

import type { SimulationResultSummary } from '@/simulation/types';
import { toExportRecord } from '@/lib/provenance/exporters';
import { EXPORT_SCHEMA_VERSION } from '@/lib/provenance/exporters';
import type { ExportPayload } from '@/lib/provenance/exporters';
import type { MetricCatalogEntry } from '@/lib/provenance/metricCatalog';
import type { ProvenancedMetric } from '@/lib/provenance/types';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export interface BuildSimulationResultOptions {
  now?: Date;
}

export interface BuiltSimulationResult {
  payload: ExportPayload;
  narrative: Array<{ heading: string; body: string }>;
}

export function buildSimulationResultPayload(
  result: SimulationResultSummary,
  options: BuildSimulationResultOptions = {},
): BuiltSimulationResult {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const observedAt = generatedAt; // simulation observation = generation time

  const records = [] as ExportPayload['records'];

  // Scenario metadata → static / user-configured.
  const scenarioSource = 'AURA simulation scenario (user-configured)';
  const scenarioMeta: Array<{ id: string; label: string; value: string | number; unit: string | null }> = [
    { id: 'sim.scenario.id', label: 'Scenario ID', value: result.scenarioId, unit: null },
    { id: 'sim.scenario.name', label: 'Scenario name', value: result.scenarioName, unit: null },
    { id: 'sim.scenario.duration', label: 'Scenario duration', value: result.durationSec, unit: 'seconds' },
    { id: 'sim.scenario.event-count', label: 'Simulated events', value: result.events.length, unit: 'events' },
  ];
  for (const m of scenarioMeta) {
    const catalog: MetricCatalogEntry = {
      id: m.id,
      label: m.label,
      provenance: 'static',
      source: scenarioSource,
      description: 'Scenario input; not a measurement.',
    };
    const metric: ProvenancedMetric<string | number> = {
      value: m.value,
      provenance: 'static',
      sourceName: scenarioSource,
    };
    records.push(toExportRecord({ catalog, metric, unit: m.unit }));
  }

  // KPI deltas → before as demo, after as simulated.
  for (const d of result.kpiDeltas) {
    const baseId = `sim.kpi.${slug(d.id || d.label)}`;
    const unit = d.unit ?? null;

    const beforeCatalog: MetricCatalogEntry = {
      id: `${baseId}.before`,
      label: `${d.label} — baseline`,
      provenance: 'demo',
      source: 'AURA baseline fixture',
      description: 'Pre-scenario baseline value from the AURA demonstration fixture.',
    };
    records.push(
      toExportRecord({
        catalog: beforeCatalog,
        metric: {
          value: d.before,
          provenance: 'demo',
          sourceName: 'AURA baseline fixture',
          sourceTimestamp: observedAt,
        },
        unit,
      }),
    );

    const afterCatalog: MetricCatalogEntry = {
      id: `${baseId}.after`,
      label: `${d.label} — estimator result`,
      provenance: 'simulated',
      source: 'AURA simulation estimator',
      description: 'Post-scenario value produced by the AURA simulation estimator. Not live telemetry.',
    };
    records.push(
      toExportRecord({
        catalog: afterCatalog,
        metric: {
          value: d.after,
          provenance: 'simulated',
          sourceName: 'AURA simulation estimator',
          sourceTimestamp: observedAt,
        },
        unit,
      }),
    );
  }

  const narrative: BuiltSimulationResult['narrative'] = [];
  if (result.rcaMarkdown) narrative.push({ heading: 'Root cause analysis', body: result.rcaMarkdown });
  if (result.recommendationsMarkdown) narrative.push({ heading: 'Recommendations', body: result.recommendationsMarkdown });

  const payload: ExportPayload = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    surface: `simulation.result.${result.scenarioId}`,
    title: `Simulation result — ${result.scenarioName}`,
    generatedAt,
    records,
    note: 'Simulation output. Baseline values are demonstration fixtures; post-scenario values are estimator output. No row is live telemetry.',
  };

  return { payload, narrative };
}
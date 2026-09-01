/**
 * Provenance-preserving export of a recorded workspace simulation run
 * (page-wiring finding PW-P1-03: Compare/Review had no export path).
 *
 * Every exported value is a modelled AURA simulation output, so each record
 * is classified `simulated` and the payload carries the Stage 5 truth block.
 * No live telemetry is claimed.
 */
import {
  buildExportOperatingState,
  toExportRecord,
  type ExportPayload,
  type ExportRecord,
} from '@/lib/provenance/exporters';
import { KPI_DESCRIPTORS, type KpiKey } from './facilityModel';
import type { WorkspaceRun } from './scenarioEngine';

export const RUN_EXPORT_SURFACE = 'workspace.simulation-run';

function recordFor(run: WorkspaceRun, key: KpiKey, phase: 'baseline' | 'result'): ExportRecord {
  const d = KPI_DESCRIPTORS[key];
  return toExportRecord({
    catalog: {
      id: `${phase}.${d.key}`,
      label: `${d.label} (${phase === 'baseline' ? 'baseline' : 'scenario'})`,
      provenance: 'simulated',
      source: 'AURA deterministic scenario engine',
      description: d.derivation,
    },
    metric: {
      value: run[phase][key],
      provenance: 'simulated',
      sourceTimestamp: run.completedAt,
    },
    unit: d.unit || null,
  });
}

/** Build the canonical export payload for one recorded run. */
export function buildRunExportPayload(run: WorkspaceRun): ExportPayload {
  const keys = Object.keys(KPI_DESCRIPTORS) as KpiKey[];
  const decisionRecords: ExportRecord[] = (run.decisionRecords ?? []).map((decision) => ({
    metricId: `decision.${decision.id}`,
    metricName: `Decision: ${decision.recommendationId}`,
    value: decision.outcome,
    unit: null,
    provenance: 'simulated',
    source: `public.decision_records:${decision.id}`,
    observedAt: decision.decidedAt,
    stale: false,
    description: `Recorded by ${decision.approver}. Rationale: ${decision.rationale}. Evidence schema ${decision.evidenceSchemaVersion}; snapshot ${decision.snapshotHash}; decision ${decision.decisionHash ?? 'legacy-unavailable'}.`,
  }));
  return {
    schemaVersion: '1.0.0',
    surface: RUN_EXPORT_SURFACE,
    title: `Simulation run ${run.id} - ${run.scenarioLabel}`,
    generatedAt: new Date().toISOString(),
    records: [
      ...keys.map((k) => recordFor(run, k, 'baseline')),
      ...keys.map((k) => recordFor(run, k, 'result')),
      ...decisionRecords,
    ],
    note: `Facility ${run.facilityName}. Scenario ${run.scenarioLabel}. Run started ${run.startedAt}, completed ${run.completedAt}.`,
    operatingState: buildExportOperatingState({
      simulationRunId: run.id,
      scenario: run.scenarioLabel,
      calculationTimestamp: run.completedAt,
      humanReviewStatus:
        decisionRecords.length > 0
          ? `${decisionRecords.length} append-only decision record${decisionRecords.length === 1 ? '' : 's'}`
          : 'Not reviewed',
    }),
  };
}

/** Deterministic, filesystem-safe filename for a run export. */
export function runExportFilename(run: WorkspaceRun, format: 'csv' | 'json'): string {
  return `aura-run-${run.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.${format}`;
}

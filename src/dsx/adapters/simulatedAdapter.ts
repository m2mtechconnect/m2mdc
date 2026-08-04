/**
 * Deterministic simulated-data adapter (Evidence Beta default).
 * Emits SIMULATED snapshots only; never claims LIVE.
 */
import type { OperationalSource, SourceSnapshot } from './types';
import { ingestRecords } from './ingestPipeline';
import {
  buildTimeline,
  TICKS,
  type TimelineId,
} from '../fixtures/timelines';
import {
  EVIDENCE_BETA_ASSETS,
  EVIDENCE_BETA_MAPPINGS,
  EVIDENCE_BETA_SOURCE_SYSTEM,
  EVIDENCE_BETA_SEED,
} from '../fixtures/evidenceBetaFacility';
import { newRunId } from '../contracts/simulationRun';

export function createSimulatedSource(timeline: TimelineId, startedAtIso: string): OperationalSource {
  const all = buildTimeline(timeline);
  const runId = newRunId(`sim:${timeline}`, EVIDENCE_BETA_SEED, startedAtIso);

  return {
    id: `simulated:${timeline}`,
    mode: 'SIMULATED',
    description: `Deterministic simulated ${timeline.replace('_', ' ')} timeline (seed ${EVIDENCE_BETA_SEED})`,
    maxTick: TICKS - 1,
    snapshotAt(tick: number): SourceSnapshot {
      const upTo = all.filter((r) => r.tick <= tick);
      const { accepted, rejected } = ingestRecords(upTo, EVIDENCE_BETA_MAPPINGS, EVIDENCE_BETA_SOURCE_SYSTEM);
      const last = accepted.length
        ? accepted.reduce((a, b) => (Date.parse(b.envelope.observed_at) > Date.parse(a.envelope.observed_at) ? b : a))
            .envelope.observed_at
        : null;
      return {
        data_mode: 'SIMULATED',
        connection_state: 'disabled',
        last_observed_at: last,
        run_id: runId,
        tick,
        accepted,
        rejected,
        assets: EVIDENCE_BETA_ASSETS,
        mappings: EVIDENCE_BETA_MAPPINGS,
      };
    },
  };
}
/**
 * Historical replay adapter.
 *
 * REPLAYED requires BOTH an identified dataset and a replay run id.
 * Without them the adapter resolves to UNAVAILABLE — it never falls back
 * to simulated data.
 */
import type { OperationalSource, SourceSnapshot } from './types';
import { ingestRecords } from './ingestPipeline';
import type { FixtureRecord } from '../fixtures/timelines';
import {
  EVIDENCE_BETA_ASSETS,
  EVIDENCE_BETA_MAPPINGS,
  EVIDENCE_BETA_SOURCE_SYSTEM,
} from '../fixtures/evidenceBetaFacility';

export interface ReplayDataset {
  dataset_id: string;
  dataset_version: string;
  records: FixtureRecord[];
}

export function createReplaySource(
  dataset: ReplayDataset | null,
  replayRunId: string | null,
): OperationalSource {
  const usable = dataset !== null && replayRunId !== null && dataset.records.length > 0;
  const maxTick = usable ? Math.max(...dataset!.records.map((r) => r.tick)) : 0;

  return {
    id: usable ? `replay:${dataset!.dataset_id}@${dataset!.dataset_version}` : 'replay:unavailable',
    mode: usable ? 'REPLAYED' : 'UNAVAILABLE',
    description: usable
      ? `Replay of dataset ${dataset!.dataset_id} v${dataset!.dataset_version}`
      : 'No replay dataset and run identifier supplied — replay unavailable.',
    maxTick,
    snapshotAt(tick: number): SourceSnapshot {
      if (!usable) {
        return {
          data_mode: 'UNAVAILABLE',
          connection_state: 'disconnected',
          last_observed_at: null,
          run_id: null,
          tick,
          accepted: [],
          rejected: [],
          assets: EVIDENCE_BETA_ASSETS,
          mappings: EVIDENCE_BETA_MAPPINGS,
        };
      }
      const upTo = dataset!.records.filter((r) => r.tick <= tick);
      const { accepted, rejected } = ingestRecords(upTo, EVIDENCE_BETA_MAPPINGS, EVIDENCE_BETA_SOURCE_SYSTEM);
      const last = accepted.length
        ? accepted.reduce((a, b) => (Date.parse(b.envelope.observed_at) > Date.parse(a.envelope.observed_at) ? b : a))
            .envelope.observed_at
        : null;
      return {
        data_mode: 'REPLAYED',
        connection_state: 'disabled',
        last_observed_at: last,
        run_id: replayRunId,
        tick,
        accepted,
        rejected,
        assets: EVIDENCE_BETA_ASSETS,
        mappings: EVIDENCE_BETA_MAPPINGS,
      };
    },
  };
}
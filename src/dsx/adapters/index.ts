export * from './types';
export * from './ingestPipeline';
export * from './simulatedAdapter';
export * from './replayAdapter';
export * from './liveDisabledAdapter';

import type { DataMode } from '../modes';
import type { OperationalSource } from './types';
import { createSimulatedSource } from './simulatedAdapter';
import { createReplaySource, type ReplayDataset } from './replayAdapter';
import { createLiveDsxSource } from './liveDisabledAdapter';
import type { TimelineId } from '../fixtures/timelines';

export interface SourceSelection {
  mode: DataMode;
  timeline?: TimelineId;
  startedAtIso?: string;
  replayDataset?: ReplayDataset | null;
  replayRunId?: string | null;
}

/** Single entry point used by the UI. No mock conditionals in components. */
export function resolveSource(sel: SourceSelection): OperationalSource {
  switch (sel.mode) {
    case 'SIMULATED':
      return createSimulatedSource(sel.timeline ?? 'cooling_degradation', sel.startedAtIso ?? '2026-03-02T08:00:00.000Z');
    case 'REPLAYED':
      return createReplaySource(sel.replayDataset ?? null, sel.replayRunId ?? null);
    case 'LIVE':
      return createLiveDsxSource();
    case 'UNAVAILABLE':
    default:
      return createLiveDsxSource();
  }
}
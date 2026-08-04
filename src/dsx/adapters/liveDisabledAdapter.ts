/**
 * Live DSX Exchange adapter — DISABLED and fail-closed.
 *
 * The transport is intentionally not implemented. Requesting LIVE while the
 * gateway is unverified yields UNAVAILABLE, never simulated or replayed data.
 */
import type { OperationalSource, SourceSnapshot } from './types';
import { LIVE_MODE_ENABLED } from '../modes';
import { EVIDENCE_BETA_ASSETS, EVIDENCE_BETA_MAPPINGS } from '../fixtures/evidenceBetaFacility';

export const LIVE_DISABLED_REASON =
  'Live DSX connectivity is disabled: no authenticated DSX gateway has been verified for this build.';

export function createLiveDsxSource(): OperationalSource {
  return {
    id: 'dsx-exchange:disabled',
    mode: 'UNAVAILABLE',
    description: LIVE_DISABLED_REASON,
    maxTick: 0,
    snapshotAt(tick: number): SourceSnapshot {
      if (LIVE_MODE_ENABLED) {
        // Unreachable in this build; kept explicit so enabling live requires
        // an intentional code change plus a verified gateway.
        throw new Error('Live DSX adapter enabled without a verified gateway implementation.');
      }
      return {
        data_mode: 'UNAVAILABLE',
        connection_state: 'disabled',
        last_observed_at: null,
        run_id: null,
        tick,
        accepted: [],
        rejected: [],
        assets: EVIDENCE_BETA_ASSETS,
        mappings: EVIDENCE_BETA_MAPPINGS,
      };
    },
  };
}
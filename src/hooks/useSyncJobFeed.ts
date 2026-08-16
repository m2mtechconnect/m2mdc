/**
 * Sync-job feed state (finding PW-P2-04).
 *
 * `/connect/monitor` previously rendered a spinner that never settled next to
 * hard-coded counters. There is no ingestion backend behind this surface, so
 * the honest terminal state is `not-configured`. The hook models every state
 * the page can truthfully be in, always settles, and never presents fixture
 * rows as live telemetry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type SyncFeedStatus =
  | 'loading'
  | 'retrying'
  | 'connected'
  | 'empty'
  | 'not-configured'
  | 'disconnected'
  | 'forbidden'
  | 'error'
  | 'timeout';

export interface SyncJobRow {
  id: string;
  source: string;
  status: 'success' | 'running' | 'failed';
  docs: number;
  duration: string;
  timestamp: string;
  error: string | null;
}

export interface SyncFeedState {
  status: SyncFeedStatus;
  /** Rows are only ever real when `status === 'connected'`. */
  jobs: SyncJobRow[];
  /** True when the rows shown are demonstration fixtures, not telemetry. */
  isDemonstration: boolean;
  message: string;
  lastCheckedAt: string | null;
  retry: () => void;
}

/** Hard ceiling: a request that never resolves must not spin forever. */
export const SYNC_FEED_TIMEOUT_MS = 8000;

const STATUS_MESSAGE: Record<SyncFeedStatus, string> = {
  loading: 'Checking for a connected ingestion service.',
  retrying: 'Retrying the ingestion service check.',
  connected: 'Connected. Showing the most recent sync jobs.',
  empty: 'Connected. No sync jobs have run yet.',
  'not-configured': 'No ingestion service is connected to this workspace. The jobs below are demonstration data, not live telemetry.',
  disconnected: 'The ingestion service is unreachable. Counters are unavailable.',
  forbidden: 'Your role cannot read ingestion jobs for this workspace.',
  error: 'The ingestion service returned an error. Counters are unavailable.',
  timeout: `No response within ${SYNC_FEED_TIMEOUT_MS / 1000} seconds. The check was stopped.`,
};

export function syncFeedMessage(status: SyncFeedStatus): string {
  return STATUS_MESSAGE[status];
}

/**
 * Probe for an ingestion service. There is no such service today, so this
 * resolves deterministically to `not-configured` rather than pretending.
 */
async function probeIngestionService(signal: AbortSignal): Promise<SyncFeedStatus> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  return 'not-configured';
}

export function useSyncJobFeed(demonstrationJobs: SyncJobRow[]): SyncFeedState {
  const [status, setStatus] = useState<SyncFeedStatus>('loading');
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      setStatus('timeout');
      setLastCheckedAt(new Date().toISOString());
    }, SYNC_FEED_TIMEOUT_MS);

    probeIngestionService(controller.signal)
      .then((next) => {
        if (settled || controller.signal.aborted) return;
        settled = true;
        setStatus(next);
        setLastCheckedAt(new Date().toISOString());
      })
      .catch(() => {
        if (settled || controller.signal.aborted) return;
        settled = true;
        setStatus('error');
        setLastCheckedAt(new Date().toISOString());
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('retrying');
    setAttempt((n) => n + 1);
  }, []);

  const isDemonstration = status === 'not-configured';

  return {
    status,
    jobs: isDemonstration ? demonstrationJobs : [],
    isDemonstration,
    message: STATUS_MESSAGE[status],
    lastCheckedAt,
    retry,
  };
}
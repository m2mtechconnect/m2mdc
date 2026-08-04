/**
 * AURA DSX data modes (Evidence Beta).
 *
 * Exactly four modes exist. There is NO silent fallback from LIVE to any
 * other mode: an unavailable live source resolves to UNAVAILABLE, never to
 * SIMULATED or REPLAYED.
 */

export const DATA_MODES = ['SIMULATED', 'REPLAYED', 'LIVE', 'UNAVAILABLE'] as const;
export type DataMode = (typeof DATA_MODES)[number];

/** Evidence Beta ships in SIMULATED by default. */
export const DEFAULT_DATA_MODE: DataMode = 'SIMULATED';

/** LIVE stays disabled until an authenticated DSX gateway is verified. */
export const LIVE_MODE_ENABLED = false;

export type FreshnessState = 'fresh' | 'delayed' | 'stale' | 'unknown';

export const DEFAULT_FRESH_MS = 60_000;
export const DEFAULT_DELAYED_MS = 300_000;

export function freshnessFor(
  observedAtIso: string | null | undefined,
  now: number,
  freshMs = DEFAULT_FRESH_MS,
  delayedMs = DEFAULT_DELAYED_MS,
): FreshnessState {
  if (!observedAtIso) return 'unknown';
  const t = Date.parse(observedAtIso);
  if (Number.isNaN(t)) return 'unknown';
  const age = now - t;
  if (age <= freshMs) return 'fresh';
  if (age <= delayedMs) return 'delayed';
  return 'stale';
}

export function modeLabel(mode: DataMode): string {
  switch (mode) {
    case 'SIMULATED': return 'Simulated';
    case 'REPLAYED': return 'Replayed';
    case 'LIVE': return 'Live';
    case 'UNAVAILABLE': return 'Unavailable';
  }
}

/** A mode is only presentable as an operational reading when data exists. */
export function isOperationalMode(mode: DataMode): boolean {
  return mode === 'LIVE';
}

/**
 * Resolve a requested mode against runtime capability. Fails closed.
 */
export function resolveMode(requested: DataMode, opts: { liveVerified?: boolean; replayRunId?: string | null } = {}): DataMode {
  if (requested === 'LIVE') {
    return LIVE_MODE_ENABLED && opts.liveVerified === true ? 'LIVE' : 'UNAVAILABLE';
  }
  if (requested === 'REPLAYED') {
    return opts.replayRunId ? 'REPLAYED' : 'UNAVAILABLE';
  }
  return requested;
}

export const UNCALIBRATED_NOTICE = 'SIMULATED — UNCALIBRATED — NOT FOR PHYSICAL CONTROL';
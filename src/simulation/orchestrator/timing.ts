/**
 * Phase 2 - orchestrator-owned execution timing.
 *
 * Duration is authoritative orchestrator data. Providers never supply it:
 * they return `{ value, externalJobId }` and nothing else is read from their
 * response, so a provider cannot report an invented elapsed time.
 *
 * Elapsed time is measured with a monotonic clock when one exists, so a
 * system-clock adjustment during a run cannot produce a negative or inflated
 * duration. Wall-clock `startedAt` / `completedAt` are recorded separately for
 * human context. When no clock can measure the interval, the duration is
 * `null` with source `unavailable` - zero never means unknown.
 */

import type { DurationSource } from './types';

export interface ExecutionTimer {
  /** Wall-clock ISO timestamp captured at start. */
  readonly startedAt: string;
  /** Reads the clock now and returns the completed measurement. */
  stop(): TimingMeasurement;
}

export interface TimingMeasurement {
  startedAt: string;
  completedAt: string;
  durationMs: number | null;
  durationSource: DurationSource;
}

function monotonicNow(): number | null {
  const p = (globalThis as { performance?: { now?: () => number } }).performance;
  if (p && typeof p.now === 'function') {
    const t = p.now();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/**
 * Starts a measurement. `wallClock` is injected so provenance timestamps stay
 * testable; the monotonic reading is always taken from the real clock because
 * it carries no meaning other than the interval between two readings.
 */
export function startExecutionTimer(wallClock: () => Date): ExecutionTimer {
  const startedAt = wallClock().toISOString();
  const monoStart = monotonicNow();

  return {
    startedAt,
    stop(): TimingMeasurement {
      const completedAt = wallClock().toISOString();
      const monoEnd = monotonicNow();
      if (monoStart !== null && monoEnd !== null) {
        // Monotonic clocks cannot run backwards; clamp defensively anyway so a
        // pathological host can never emit a negative duration.
        return {
          startedAt,
          completedAt,
          durationMs: Math.max(0, monoEnd - monoStart),
          durationSource: 'monotonic',
        };
      }
      const a = Date.parse(startedAt);
      const b = Date.parse(completedAt);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return {
          startedAt,
          completedAt,
          durationMs: Math.max(0, b - a),
          durationSource: 'wall-clock',
        };
      }
      return { startedAt, completedAt, durationMs: null, durationSource: 'unavailable' };
    },
  };
}

/** The measurement used when a record has no measurable duration at all. */
export const UNAVAILABLE_DURATION = {
  durationMs: null,
  durationSource: 'unavailable',
} as const satisfies Pick<TimingMeasurement, 'durationMs' | 'durationSource'>;
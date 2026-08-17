/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 8.
 *
 * One data-mode contract for every KPI surface.
 *
 * Two vocabularies were in use and never reconciled:
 *
 *   - `DataProvenance` (`src/lib/provenance/types.ts`): live | derived |
 *     simulated | demo | static | unavailable. Used by the app-wide KPI
 *     surfaces and the ProvenanceBadge.
 *   - `DataMode` (`src/dsx/modes.ts`): SIMULATED | REPLAYED | LIVE |
 *     UNAVAILABLE. Used by Evidence Beta.
 *
 * Neither is going away - they answer different questions (where a value
 * came from vs. which mode the surface is running in). What was missing is
 * the mapping between them, so a surface could show a `live` badge while the
 * DSX mode said UNAVAILABLE. This module is that mapping, and it fails
 * closed in both directions.
 */
import type { DataMode } from '@/dsx/modes';
import type { DataProvenance, ProvenanceMeta } from '@/lib/provenance/types';

/** The DSX mode a provenance tag resolves to. Never guesses upward. */
export const PROVENANCE_TO_DATA_MODE: Record<DataProvenance, DataMode> = {
  live: 'LIVE',
  // Derived from validated live inputs, so it is only as operational as
  // those inputs; it is still a measurement-backed reading.
  derived: 'LIVE',
  simulated: 'SIMULATED',
  demo: 'SIMULATED',
  // A configured target or threshold is not an observation of anything.
  static: 'UNAVAILABLE',
  unavailable: 'UNAVAILABLE',
};

/**
 * The DSX mode for a provenance tag, after applying the staleness rule: a
 * stale live/derived reading is not a current measurement, so it degrades to
 * UNAVAILABLE rather than being shown as LIVE.
 */
export function dataModeFor(provenance: DataProvenance, stale = false): DataMode {
  const mode = PROVENANCE_TO_DATA_MODE[provenance];
  if (mode === 'LIVE' && stale) return 'UNAVAILABLE';
  return mode;
}

/**
 * The provenance tag a surface may actually render, after degradation. A
 * stale live/derived value becomes `unavailable`; nothing is ever upgraded.
 */
export function effectiveProvenance(meta: Pick<ProvenanceMeta, 'provenance' | 'stale'>): DataProvenance {
  if ((meta.provenance === 'live' || meta.provenance === 'derived') && meta.stale === true) {
    return 'unavailable';
  }
  return meta.provenance;
}

/** Only a fresh, measurement-backed reading may be presented operationally. */
export function isPresentableAsOperational(
  meta: Pick<ProvenanceMeta, 'provenance' | 'stale'>,
): boolean {
  return dataModeFor(meta.provenance, meta.stale === true) === 'LIVE';
}

/** Synthetic values must carry a run id so the number can be reproduced. */
export function requiresRunId(provenance: DataProvenance): boolean {
  return provenance === 'simulated' || provenance === 'demo';
}

/**
 * True when a value may be rendered as a number at all. UNAVAILABLE surfaces
 * must render an explicit unavailable affordance, never a fabricated figure.
 */
export function mayRenderValue(provenance: DataProvenance, stale = false): boolean {
  return dataModeFor(provenance, stale) !== 'UNAVAILABLE';
}

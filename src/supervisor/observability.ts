/**
 * Observability readiness contract (supervisor evidence plane).
 *
 * Truth rules:
 *  - No signal may report `verified` without a concrete evidence reference.
 *  - A contract-tested client adapter is NOT live monitoring: it is reported
 *    as not-tested end-to-end until a synthetic event is observed in a real
 *    backend.
 *  - Absent evidence renders as `unavailable` or `not-assessed`. No uptime,
 *    alert count, freshness or incident value may be fabricated.
 */
import type { SupervisorPersonaId } from './types';

export const OBSERVABILITY_SIGNAL_STATUSES = [
  /** End-to-end evidence exists (reference required). */
  'verified',
  /** An artifact exists but has not been exercised against a live backend. */
  'not-tested',
  /** The underlying capability or backend is not connected. */
  'unavailable',
  /** No assessment evidence exists yet. */
  'not-assessed',
] as const;

export type ObservabilitySignalStatus = (typeof OBSERVABILITY_SIGNAL_STATUSES)[number];

export interface ObservabilitySignal {
  id: string;
  label: string;
  status: ObservabilitySignalStatus;
  /** Required when status is `verified`; otherwise null. */
  evidenceRef: string | null;
  note: string;
  ownerPersona: SupervisorPersonaId;
}

/**
 * Current truthful posture. Only the client adapter has repository evidence,
 * and even it has no live delivery evidence, so nothing here is `verified`.
 */
export const OBSERVABILITY_SIGNALS: readonly ObservabilitySignal[] = [
  {
    id: 'runtime-monitoring-client',
    label: 'Runtime monitoring client adapter',
    status: 'not-tested',
    evidenceRef: 'tests/unit/runtime-monitoring-contract.test.ts',
    note: 'Fail-closed, deduplicated client adapter with a passing contract test. No event has been observed end-to-end in an observability backend, so live delivery is not claimed.',
    ownerPersona: 'engineer',
  },
  {
    id: 'monitoring-backend',
    label: 'Observability backend (metrics, logs, traces)',
    status: 'unavailable',
    evidenceRef: null,
    note: 'No production observability backend is connected or evidenced. The client adapter ships events only when an explicit provider configuration exists.',
    ownerPersona: 'engineer',
  },
  {
    id: 'alerting',
    label: 'Alerting and on-call routing',
    status: 'not-assessed',
    evidenceRef: null,
    note: 'No alert rules, escalation policy or on-call integration evidence exists in the repository.',
    ownerPersona: 'facility-operator',
  },
  {
    id: 'telemetry-freshness',
    label: 'Telemetry freshness (facility DCIM/BMS)',
    status: 'unavailable',
    evidenceRef: null,
    note: 'No measured production telemetry feed is connected. Rendered facility values are simulated or demonstration fixtures and are labelled as such.',
    ownerPersona: 'facility-operator',
  },
  {
    id: 'incident-signals',
    label: 'Incident detection and status signals',
    status: 'not-assessed',
    evidenceRef: null,
    note: 'No incident feed, status page or post-incident record is indexed as evidence.',
    ownerPersona: 'compliance-risk',
  },
];

/** Counts for the UI. Derived, never estimated. */
export function observabilityStatusCounts(
  signals: readonly ObservabilitySignal[] = OBSERVABILITY_SIGNALS,
): Record<ObservabilitySignalStatus, number> {
  const counts: Record<ObservabilitySignalStatus, number> = {
    verified: 0,
    'not-tested': 0,
    unavailable: 0,
    'not-assessed': 0,
  };
  for (const signal of signals) counts[signal.status] += 1;
  return counts;
}

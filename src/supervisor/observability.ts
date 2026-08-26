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
    note: 'Fail-closed, deduplicated client adapter with a passing contract test. Activation is resolved through the governed observability-config endpoint and delivery relays through the observability-capture edge function - no provider key exists in the browser. Upgrade to verified requires a passing synthetic probe artifact in docs/evidence/observability/ (scripts/verify-observability-e2e.mjs).',
    ownerPersona: 'engineer',
  },
  {
    id: 'monitoring-backend',
    label: 'Observability backend (metrics, logs, traces)',
    status: 'unavailable',
    evidenceRef: null,
    note: 'A governed capture relay (supabase/functions/observability-capture) is implemented and fail-closed: it reports not_configured until a server-held PostHog project key is present. No end-to-end delivery evidence exists yet; this signal upgrades only with a verified probe artifact, never by configuration alone.',
    ownerPersona: 'engineer',
  },
  {
    id: 'alerting',
    label: 'Alerting and on-call routing',
    status: 'not-assessed',
    evidenceRef: null,
    note: 'No alert rules, escalation policy or on-call integration evidence exists in the repository. Acceptable upgrade evidence: provider alert configuration export (e.g. threshold alerts on runtime.client_error) plus a recorded test-notification delivery.',
    ownerPersona: 'facility-operator',
  },
  {
    id: 'telemetry-freshness',
    label: 'Telemetry freshness (facility DCIM/BMS)',
    status: 'unavailable',
    evidenceRef: null,
    note: 'No measured production telemetry feed is connected. Rendered facility values are simulated or demonstration fixtures and are labelled as such. Upgrade requires an authorised production broker/DCIM feed classified MEASURED under src/runtime/mqtt/provenance.ts.',
    ownerPersona: 'facility-operator',
  },
  {
    id: 'incident-signals',
    label: 'Incident detection and status signals',
    status: 'not-assessed',
    evidenceRef: null,
    note: 'No incident feed, status page or post-incident record is indexed as evidence. Acceptable upgrade evidence: a connected incident-management source (e.g. status page or on-call platform) with at least one observed incident record.',
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

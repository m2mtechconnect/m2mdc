/**
 * Operator-triggered runtime verification for managed connectors.
 *
 * A connection is only VERIFIED when a live provider probe returned at least
 * one real record in this environment. Reachability alone is PARTIAL, because
 * an authorised endpoint that returns nothing is not proof of data flow.
 *
 * This module is the server authority mirrored by
 * `src/connections/managedVerification.ts` for presentation. The server copy is
 * the authority; the unit suite keeps the two identical.
 */

export type VerificationState = 'NOT_VERIFIED' | 'PARTIAL' | 'VERIFIED' | 'FAILED';

export interface ProbeOutcome {
  /** False when the request never produced an HTTP response. */
  reachable: boolean;
  http_status: number | null;
  /** Records counted in the live payload. Null when the shape is unknown. */
  record_count: number | null;
}

export interface VerificationVerdict {
  state: VerificationState;
  reason_code: string;
  safe_message: string;
}

/**
 * Counts records in a provider payload without inspecting values. Only the
 * shape is read, so nothing sensitive is retained as evidence.
 */
export function countLiveRecords(payload: unknown): number | null {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== 'object') return null;
  const arrays = Object.values(payload as Record<string, unknown>).filter(Array.isArray) as unknown[][];
  if (arrays.length === 0) return null;
  return arrays.reduce((total, arr) => total + arr.length, 0);
}

/** Evidence-derived verdict. The latest probe always wins, in both directions. */
export function evaluateVerification(outcome: ProbeOutcome): VerificationVerdict {
  if (!outcome.reachable) {
    return {
      state: 'FAILED',
      reason_code: 'probe_unreachable',
      safe_message: 'The managed connector probe did not reach the provider. Verification state is unchanged evidence of failure, not of data.',
    };
  }
  if (outcome.http_status !== 200) {
    return {
      state: 'FAILED',
      reason_code: 'provider_request_failed',
      safe_message: `The provider rejected the probe with status ${outcome.http_status ?? 'unknown'}.`,
    };
  }
  if (outcome.record_count === null) {
    return {
      state: 'PARTIAL',
      reason_code: 'live_payload_not_countable',
      safe_message: 'The provider responded, but AURA could not count records in the payload, so live data is not proven.',
    };
  }
  if (outcome.record_count === 0) {
    return {
      state: 'PARTIAL',
      reason_code: 'reachable_no_records',
      safe_message: 'The provider authorised the probe and returned zero records. Reachability is proven; data flow is not.',
    };
  }
  return {
    state: 'VERIFIED',
    reason_code: 'live_provider_data_returned',
    safe_message: `Live provider data was returned: ${outcome.record_count} record(s) read in this environment.`,
  };
}

export const VERIFICATION_LABEL: Record<VerificationState, string> = {
  NOT_VERIFIED: 'Not verified',
  PARTIAL: 'Partially verified',
  VERIFIED: 'Runtime verified',
  FAILED: 'Verification failed',
};

export const VERIFICATION_MEANING: Record<VerificationState, string> = {
  NOT_VERIFIED: 'No operator has run a runtime verification for this connection.',
  PARTIAL: 'The connector is bound and reachable, but no live provider record has been returned.',
  VERIFIED: 'An operator-triggered probe returned live provider data in this environment.',
  FAILED: 'The last operator-triggered probe failed. See the reason recorded with the attempt.',
};

export const VERIFICATION_TONE: Record<VerificationState, 'positive' | 'caution' | 'critical' | 'neutral'> = {
  NOT_VERIFIED: 'neutral',
  PARTIAL: 'caution',
  VERIFIED: 'positive',
  FAILED: 'critical',
};

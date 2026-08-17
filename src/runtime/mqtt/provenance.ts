/**
 * Provenance policy for runtime-ingested values.
 *
 * A value is only ever labelled MEASURED when it arrives from an authorised
 * production broker, carries a source timestamp inside the freshness budget
 * and was reported as validated quality. Anything from a disposable or local
 * test broker is TEST_EVIDENCE and must never be presented as live telemetry.
 */

export type ProvenanceClass = 'MEASURED' | 'TEST_EVIDENCE' | 'SIMULATED' | 'REPLAYED' | 'UNVERIFIED';
export type EvidenceClass = 'PRODUCTION_TELEMETRY' | 'TEST_EVIDENCE';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

export function isLocalBroker(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export interface ProvenanceInput {
  brokerUrl: string;
  /** Set only when the operator has declared the broker an authorised production source. */
  productionAuthorised: boolean;
  quality: string;
  observedAt: string;
  nowMs: number;
  maxAgeMs: number;
}

export interface ProvenanceDecision {
  provenance_class: ProvenanceClass;
  evidence_class: EvidenceClass;
  reason: string;
}

export function classifyProvenance(input: ProvenanceInput): ProvenanceDecision {
  if (isLocalBroker(input.brokerUrl) || !input.productionAuthorised) {
    return {
      provenance_class: 'TEST_EVIDENCE',
      evidence_class: 'TEST_EVIDENCE',
      reason: isLocalBroker(input.brokerUrl)
        ? 'Received from a local disposable broker. Recorded as test evidence, not telemetry.'
        : 'Broker is not declared an authorised production source.',
    };
  }
  const age = input.nowMs - Date.parse(input.observedAt);
  if (!Number.isFinite(age)) {
    return { provenance_class: 'UNVERIFIED', evidence_class: 'PRODUCTION_TELEMETRY', reason: 'Unparseable source timestamp.' };
  }
  if (age > input.maxAgeMs) {
    return { provenance_class: 'UNVERIFIED', evidence_class: 'PRODUCTION_TELEMETRY', reason: 'Observation is outside the freshness budget.' };
  }
  if (input.quality !== 'validated') {
    return { provenance_class: 'UNVERIFIED', evidence_class: 'PRODUCTION_TELEMETRY', reason: `Source reported quality "${input.quality}".` };
  }
  return {
    provenance_class: 'MEASURED',
    evidence_class: 'PRODUCTION_TELEMETRY',
    reason: 'Authorised production broker, validated quality, within the freshness budget.',
  };
}
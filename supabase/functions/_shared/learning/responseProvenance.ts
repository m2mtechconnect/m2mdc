/**
 * Per-response provenance record.
 *
 * Emitted additively on the assistant stream (SSE `{ type: 'provenance' }`)
 * after the answer, on BOTH the deterministic truth path and the model path.
 *
 * Truth rules:
 *   - Unknown values stay `null` and are named in `limitations`; nothing is
 *     inferred, and a configured model id is never reported as availability.
 *   - The record carries no tenant, user, credential or free-form content.
 */
import type { ResolvedModelPolicy } from './modelPolicy.ts';

export const RESPONSE_PROVENANCE_SCHEMA = 'aura.response-provenance.v1';

export type AssistantAnswerPath = 'truth' | 'model';

export interface AssistantTokenUsage {
  input: number | null;
  output: number | null;
}

export interface AssistantResponseProvenance {
  schema: typeof RESPONSE_PROVENANCE_SCHEMA;
  path: AssistantAnswerPath;
  /** Null on the deterministic truth path: no provider was invoked. */
  provider: string | null;
  model: string | null;
  modelVersion: string | null;
  modelAvailabilityEvidence: 'not-verified';
  policy: string;
  policyVersion: string;
  promptVersion: string;
  lessonIds: readonly string[];
  latencyMs: number | null;
  tokens: AssistantTokenUsage;
  groundedCitationCount: number | null;
  rejectedClientClaimCount: number | null;
  limitations: readonly string[];
  emittedAt: string;
}

export interface BuildResponseProvenanceInput {
  path: AssistantAnswerPath;
  policy: ResolvedModelPolicy;
  lessonIds?: readonly string[];
  latencyMs?: number | null;
  tokens?: { input?: number | null; output?: number | null } | null;
  groundedCitationCount?: number | null;
  rejectedClientClaimCount?: number | null;
  emittedAt?: string;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Pure builder. Never throws, never infers a missing value. */
export function buildResponseProvenance(input: BuildResponseProvenanceInput): AssistantResponseProvenance {
  const limitations: string[] = [];
  const latencyMs = finiteOrNull(input.latencyMs);
  const tokens: AssistantTokenUsage = {
    input: finiteOrNull(input.tokens?.input),
    output: finiteOrNull(input.tokens?.output),
  };

  if (input.path === 'truth') {
    limitations.push(
      'Deterministic truth path: no provider and no model were invoked, so provider, model, model version and token usage are not applicable.',
    );
  } else {
    if (tokens.input === null && tokens.output === null) {
      limitations.push('Token usage was not supplied by the streaming provider response.');
    }
    limitations.push(
      'The model identifier is configuration only. It is not evidence that the model is available, healthy or production ready.',
    );
  }
  if (latencyMs === null) limitations.push('Latency was not measured for this response.');

  return {
    schema: RESPONSE_PROVENANCE_SCHEMA,
    path: input.path,
    provider: input.path === 'truth' ? null : input.policy.provider,
    model: input.path === 'truth' ? null : input.policy.model,
    modelVersion: input.path === 'truth' ? null : input.policy.modelVersion,
    modelAvailabilityEvidence: 'not-verified',
    policy: input.policy.policy,
    policyVersion: input.policy.policyVersion,
    promptVersion: input.policy.promptVersion,
    lessonIds: [...(input.lessonIds ?? [])],
    latencyMs,
    tokens,
    groundedCitationCount: finiteOrNull(input.groundedCitationCount),
    rejectedClientClaimCount: finiteOrNull(input.rejectedClientClaimCount),
    limitations,
    emittedAt: input.emittedAt ?? new Date().toISOString(),
  };
}

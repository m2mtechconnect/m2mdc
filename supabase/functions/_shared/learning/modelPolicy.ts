/**
 * Provider-neutral, server-owned model policy.
 *
 * The browser can never select a model. Runtime callers name a POLICY; this
 * module resolves the provider, model id and generation parameters, and
 * publishes the policy/prompt versions recorded in response provenance.
 *
 * A configured model id is NOT evidence that the model is available, healthy
 * or production ready. `availabilityEvidence` is therefore always
 * 'not-verified' until a runtime probe supplies evidence.
 */

export const MODEL_POLICY_VERSION = 'aura.model-policy.v1';
export const PROMPT_VERSION = 'aura.copilot-prompt.v1';

export const MODEL_POLICY_NAMES = ['truth-grounding', 'general-assistant'] as const;
export type ModelPolicyName = (typeof MODEL_POLICY_NAMES)[number];

export interface ResolvedModelPolicy {
  policy: ModelPolicyName;
  policyVersion: string;
  promptVersion: string;
  /** Provider-neutral transport label; not a vendor endorsement. */
  provider: 'aura-managed-gateway';
  /** Null on the deterministic truth path: no model is invoked at all. */
  model: string | null;
  modelVersion: string | null;
  temperature: number | null;
  maxTokens: number | null;
  availabilityEvidence: 'not-verified';
}

const POLICIES: Record<ModelPolicyName, ResolvedModelPolicy> = {
  'truth-grounding': {
    policy: 'truth-grounding',
    policyVersion: MODEL_POLICY_VERSION,
    promptVersion: PROMPT_VERSION,
    provider: 'aura-managed-gateway',
    model: null,
    modelVersion: null,
    temperature: null,
    maxTokens: null,
    availabilityEvidence: 'not-verified',
  },
  'general-assistant': {
    policy: 'general-assistant',
    policyVersion: MODEL_POLICY_VERSION,
    promptVersion: PROMPT_VERSION,
    provider: 'aura-managed-gateway',
    model: 'google/gemini-3-pro-preview',
    modelVersion: 'google/gemini-3-pro-preview',
    temperature: 0.7,
    maxTokens: 2048,
    availabilityEvidence: 'not-verified',
  },
};

/**
 * Resolve a server-owned policy. Any client-supplied model hint is IGNORED:
 * this function only accepts a policy name known to the server.
 */
export function resolveModelPolicy(policy: ModelPolicyName): ResolvedModelPolicy {
  return { ...POLICIES[policy] };
}

/**
 * Fail-closed guard used by tests and callers: a browser-selected model id is
 * never accepted as input to model routing.
 */
export function isClientModelSelectionAccepted(): false {
  return false;
}

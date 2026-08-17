/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 7.
 *
 * One declaration of what an AURA agent actually is.
 *
 * Across the app, agents were described three incompatible ways:
 * "autonomous", "triggers automated responses" and, in the capability
 * registry, "deterministic automation and analytical services that perform
 * no closed-loop control". Only the last one is true of the shipped code:
 *
 *   - agent logic is AURA-authored and deterministic;
 *   - no NVIDIA inference microservice (NIM) or retrieval service (NeMo
 *     Retriever) is invoked - both are documentation-only;
 *   - agents emit findings and recommendations; a human approves before
 *     anything is applied, and nothing actuates physical infrastructure.
 */

export type AgentAutonomyLevel = 'advisory' | 'human-approved' | 'closed-loop';

export type AgentInferenceClass =
  /** AURA-authored deterministic rules and analytics. No model inference. */
  | 'aura-deterministic'
  /** Hosted LLM used for explanation only, never for control. */
  | 'hosted-llm-advisory'
  /** NVIDIA inference microservice. Not deployed. */
  | 'nvidia-nim';

export interface AgentPositioning {
  /** Highest autonomy any shipped agent may claim. */
  autonomy: AgentAutonomyLevel;
  /** Inference classes that are actually reachable at runtime. */
  availableInference: AgentInferenceClass[];
  /** Inference classes that exist only on the roadmap. */
  unavailableInference: AgentInferenceClass[];
  /** True when an agent may change infrastructure without a human step. */
  actuatesInfrastructure: boolean;
  statements: string[];
}

export const AURA_AGENT_POSITIONING: AgentPositioning = {
  autonomy: 'human-approved',
  availableInference: ['aura-deterministic', 'hosted-llm-advisory'],
  unavailableInference: ['nvidia-nim'],
  actuatesInfrastructure: false,
  statements: [
    'AURA agents are deterministic analytical services authored by AURA.',
    'Agents produce findings and recommendations; a human approves every applied change.',
    'No NVIDIA NIM or NeMo Retriever runtime is invoked.',
    'No agent performs closed-loop control of physical infrastructure.',
  ],
};

/**
 * Phrases that overstate agent autonomy or imply NVIDIA inference. Guards and
 * copy reviews use this list; the replacement is the wording to ship instead.
 */
export const PROHIBITED_AGENT_PHRASES: Array<{ phrase: string; replacement: string }> = [
  { phrase: 'autonomous agent', replacement: 'AURA agent' },
  { phrase: 'autonomous ai agent', replacement: 'AURA agent' },
  { phrase: 'autonomous ai system', replacement: 'AURA digital twin system' },
  { phrase: 'self-healing', replacement: 'recommends remediation' },
  { phrase: 'closed-loop control', replacement: 'human-approved recommendation' },
  { phrase: 'nim-powered', replacement: 'AURA agent' },
  { phrase: 'nemo retriever', replacement: 'pgvector retrieval (planned)' },
];

export function findAgentPositioningViolations(
  text: string,
): Array<{ phrase: string; replacement: string }> {
  const haystack = text.toLowerCase();
  return PROHIBITED_AGENT_PHRASES.filter((p) => haystack.includes(p.phrase));
}

export function isAgentCopyAllowed(text: string): boolean {
  return findAgentPositioningViolations(text).length === 0;
}

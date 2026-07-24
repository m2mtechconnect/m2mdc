/**
 * Centralized LLM Client (client-side stub).
 *
 * PR-0.1 Checkpoint B: browser-side LLM calls are disabled. The prior
 * implementation embedded VITE_LOVABLE_API_KEY into the production bundle,
 * which meant the provider credential shipped to every visitor. That
 * behaviour has been removed until a server-mediated LLM edge function is
 * introduced in a later checkpoint.
 *
 * This module now returns a typed `LlmUnavailableError`. Callers MUST render
 * an accessible "AI unavailable" state — never a fabricated or synthetic
 * completion. Do NOT reintroduce `import.meta.env.VITE_LOVABLE_API_KEY`
 * here or in any other client-side module.
 */

export interface AIClientOptions {
  model?: 'pro' | 'fallback';
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionResponse {
  choices: Array<{
    message: { content: string; role: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LlmUnavailableError extends Error {
  readonly code = 'LLM_CLIENT_DISABLED' as const;
  constructor(message = 'Browser-side LLM calls are disabled (PR-0.1).') {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

export function isLlmAvailable(): false {
  return false;
}

export function getAIClient(_options: AIClientOptions = {}): never {
  throw new LlmUnavailableError();
}

export async function makeAICompletion(
  _messages: AIMessage[],
  _options: AIClientOptions = {}
): Promise<AICompletionResponse> {
  throw new LlmUnavailableError();
}

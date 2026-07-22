/**
 * Centralized LLM Client for AURA Agent Studio
 * Uses the managed AI Gateway with Latest Gemini 3.x Models
 * 
 * ENFORCES: All Co-Pilot interactions use Gemini 3.x or later
 */

import { resolveLatestGeminiModel, getFallbackGeminiModel, enforceGemini3x } from './modelResolver';

export interface AIClientOptions {
  model?: 'pro' | 'fallback'; // Removed 'fast' and 'lite' - only Gemini 3.x
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get AI client configuration
 * ALWAYS uses latest Gemini 3.x model
 */
export function getAIClient(options: AIClientOptions = {}) {
  const { model = 'pro', temperature = 0.7, maxTokens = 2048 } = options;

  // Resolve to latest Gemini 3.x model
  let resolvedModel: string;
  if (model === 'fallback') {
    resolvedModel = getFallbackGeminiModel();
  } else {
    resolvedModel = resolveLatestGeminiModel();
  }

  // Enforce Gemini 3.x usage
  enforceGemini3x(resolvedModel);

  return {
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions', // managed AI gateway endpoint
    model: resolvedModel,
    temperature,
    maxTokens,
  };
}

/**
 * Make an AI completion request
 */
export async function makeAICompletion(
  messages: AIMessage[],
  options: AIClientOptions = {}
): Promise<AICompletionResponse> {
  const client = getAIClient(options);
  
  // Get API key from environment
  const apiKey = import.meta.env.VITE_LOVABLE_API_KEY;

  if (!apiKey) {
    throw new Error('AI gateway API key not configured');
  }

  const response = await fetch(client.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: client.model,
      messages,
      temperature: client.temperature,
      max_tokens: client.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI Gateway error: ${response.status} - ${error}`);
  }

  return await response.json();
}

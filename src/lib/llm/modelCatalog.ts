/**
 * Managed AI model catalogue (data only).
 *
 * Internal identifiers, context windows and pricing are retained for backend
 * compatibility and selection behaviour. Customer-visible surfaces must render
 * the provider-neutral labels from `@/lib/llm/modelLabels` rather than the raw
 * `id`, `name`, `provider` or `description` fields stored here.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: "free" | "low" | "medium" | "high";
  pricingDetails: string;
  capabilities: string[];
  contextWindow: string;
  speed: "fast" | "medium" | "slow";
  recommended?: boolean;
  supportedRegions: string[];
  requiresAuth: boolean;
  ragSettings: {
    topK: number;
    topN: number;
    temperature: number;
    hybridSearch: boolean;
  };
}

export const models: ModelConfig[] = [
  // Google Models
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast, efficient model for general-purpose tasks with excellent reasoning",
    pricing: "low",
    pricingDetails: "$0.075 / 1M input tokens",
    capabilities: ["Text", "Vision", "Multilingual", "RAG-optimized"],
    contextWindow: "1M tokens",
    speed: "fast",
    recommended: true,
    supportedRegions: ["northamerica-northeast1", "us-central1", "europe-west1"],
    requiresAuth: false,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Advanced reasoning with multimodal capabilities for complex tasks",
    pricing: "medium",
    pricingDetails: "$1.25 / 1M input tokens",
    capabilities: ["Text", "Vision", "Code", "Advanced Reasoning"],
    contextWindow: "2M tokens",
    speed: "medium",
    supportedRegions: ["northamerica-northeast1", "us-central1", "europe-west1"],
    requiresAuth: false,
    ragSettings: { topK: 25, topN: 8, temperature: 0.6, hybridSearch: true }
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    description: "Fastest + cheapest of the Gemini 2.5 line. Good for classification, summarization",
    pricing: "low",
    pricingDetails: "$0.035 / 1M input tokens",
    capabilities: ["Text", "Classification", "Summarization"],
    contextWindow: "1M tokens",
    speed: "fast",
    supportedRegions: ["northamerica-northeast1", "us-central1"],
    requiresAuth: false,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },
  
  // OpenAI Models
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description: "Powerful all-rounder. Excellent reasoning, long context, multimodal",
    pricing: "high",
    pricingDetails: "$2.50 / 1M input tokens",
    capabilities: ["Text", "Vision", "Advanced Reasoning", "Code"],
    contextWindow: "128K tokens",
    speed: "medium",
    recommended: true,
    supportedRegions: ["global"],
    requiresAuth: false,
    ragSettings: { topK: 20, topN: 7, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description: "Middle ground: much lower cost & latency than standard but keeps most reasoning",
    pricing: "low",
    pricingDetails: "$0.15 / 1M input tokens",
    capabilities: ["Text", "Vision", "Code"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: false,
    ragSettings: { topK: 18, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    description: "Designed for speed & cost saving. Very efficient for high-volume/simple tasks",
    pricing: "low",
    pricingDetails: "$0.05 / 1M input tokens",
    capabilities: ["Text", "Classification", "Summarization"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: false,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },

  // Anthropic Models
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    description: "Most capable and intelligent model with superior reasoning and analysis",
    pricing: "high",
    pricingDetails: "$3.00 / 1M input tokens",
    capabilities: ["Text", "Vision", "Advanced Reasoning", "Code", "Analysis"],
    contextWindow: "200K tokens",
    speed: "medium",
    recommended: true,
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 25, topN: 8, temperature: 0.6, hybridSearch: true }
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description: "Highly intelligent model with exceptional reasoning for complex tasks",
    pricing: "high",
    pricingDetails: "$15.00 / 1M input tokens",
    capabilities: ["Text", "Vision", "Advanced Reasoning", "Research", "Code"],
    contextWindow: "200K tokens",
    speed: "slow",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 30, topN: 10, temperature: 0.5, hybridSearch: true }
  },
  {
    id: "anthropic/claude-haiku-3-5",
    name: "Claude Haiku 3.5",
    provider: "Anthropic",
    description: "Fastest Claude model for quick, efficient responses",
    pricing: "low",
    pricingDetails: "$0.25 / 1M input tokens",
    capabilities: ["Text", "Classification", "Fast Responses"],
    contextWindow: "200K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },

  // DeepSeek Models
  {
    id: "deepseek/deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Cost-effective model with strong reasoning and coding capabilities",
    pricing: "low",
    pricingDetails: "$0.27 / 1M input tokens",
    capabilities: ["Text", "Code", "Reasoning", "Math"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "deepseek/deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    description: "Specialized for code generation and technical problem solving",
    pricing: "low",
    pricingDetails: "$0.14 / 1M input tokens",
    capabilities: ["Code", "Technical Writing", "Debugging"],
    contextWindow: "64K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 18, topN: 5, temperature: 0.6, hybridSearch: false }
  },

  // Cohere Models
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    description: "Enterprise-grade model optimized for RAG and retrieval tasks",
    pricing: "medium",
    pricingDetails: "$2.50 / 1M input tokens",
    capabilities: ["Text", "RAG-optimized", "Multilingual", "Search"],
    contextWindow: "128K tokens",
    speed: "fast",
    recommended: true,
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 25, topN: 8, temperature: 0.6, hybridSearch: true }
  },
  {
    id: "cohere/command-r",
    name: "Command R",
    provider: "Cohere",
    description: "Balanced model for retrieval-augmented generation applications",
    pricing: "low",
    pricingDetails: "$0.50 / 1M input tokens",
    capabilities: ["Text", "RAG", "Multilingual"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },

  // Mistral Models
  {
    id: "mistral/mistral-large-2",
    name: "Mistral Large 2",
    provider: "Mistral",
    description: "Flagship model with top-tier reasoning and multilingual support",
    pricing: "medium",
    pricingDetails: "$2.00 / 1M input tokens",
    capabilities: ["Text", "Code", "Multilingual", "Reasoning"],
    contextWindow: "128K tokens",
    speed: "medium",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 22, topN: 7, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "mistral/mistral-small",
    name: "Mistral Small",
    provider: "Mistral",
    description: "Fast and efficient model for everyday tasks",
    pricing: "low",
    pricingDetails: "$0.20 / 1M input tokens",
    capabilities: ["Text", "Classification", "Summarization"],
    contextWindow: "32K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "mistral/codestral",
    name: "Codestral",
    provider: "Mistral",
    description: "Specialized coding model for software development",
    pricing: "low",
    pricingDetails: "$0.30 / 1M input tokens",
    capabilities: ["Code", "Technical Writing", "Debugging"],
    contextWindow: "32K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 18, topN: 5, temperature: 0.6, hybridSearch: false }
  },

  // Hugging Face Models
  {
    id: "huggingface/llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Hugging Face",
    description: "Open-source model with strong general capabilities",
    pricing: "low",
    pricingDetails: "$0.50 / 1M input tokens",
    capabilities: ["Text", "Code", "Open Source"],
    contextWindow: "128K tokens",
    speed: "medium",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "huggingface/mixtral-8x7b",
    name: "Mixtral 8x7B",
    provider: "Hugging Face",
    description: "Efficient mixture-of-experts model for diverse tasks",
    pricing: "low",
    pricingDetails: "$0.24 / 1M input tokens",
    capabilities: ["Text", "Multilingual", "Open Source"],
    contextWindow: "32K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 18, topN: 6, temperature: 0.7, hybridSearch: true }
  }
];

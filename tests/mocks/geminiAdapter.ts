/**
 * Mock adapter for Gemini/Vertex AI
 * Returns deterministic answers and citations for testing
 */

export interface GeminiResponse {
  answer: string;
  citations: Array<{
    source: string;
    snippet: string;
    url?: string;
  }>;
  grounding_metadata?: {
    search_queries: string[];
    grounding_supports: Array<{
      segment: { text: string };
      grounding_chunk_indices: number[];
      confidence_scores: number[];
    }>;
  };
}

const mockResponses: Record<string, GeminiResponse> = {
  compliance: {
    answer: 'Based on GDPR Article 30, organizations must maintain records of processing activities including purposes, data categories, and retention periods.',
    citations: [
      {
        source: 'GDPR Article 30',
        snippet: 'Each controller shall maintain a record of processing activities',
        url: 'https://gdpr-info.eu/art-30-gdpr/',
      },
    ],
    grounding_metadata: {
      search_queries: ['GDPR Article 30 requirements'],
      grounding_supports: [
        {
          segment: { text: 'maintain records of processing activities' },
          grounding_chunk_indices: [0],
          confidence_scores: [0.95],
        },
      ],
    },
  },
  predictive: {
    answer: 'Equipment failure predicted in 72 hours. Recommended action: Schedule preventive maintenance for conveyor belt motor #3.',
    citations: [
      {
        source: 'Sensor Data Analytics',
        snippet: 'Vibration levels exceeding normal threshold by 40%',
      },
    ],
  },
  default: {
    answer: 'This is a test response from the mock Gemini adapter.',
    citations: [
      {
        source: 'Test Source',
        snippet: 'Mock data for testing purposes',
      },
    ],
  },
};

export class MockGeminiAdapter {
  async generateContent(prompt: string, options?: { grounding?: boolean; temperature?: number }): Promise<GeminiResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Determine response based on prompt content
    if (prompt.toLowerCase().includes('compliance') || prompt.toLowerCase().includes('gdpr')) {
      return mockResponses.compliance;
    }
    if (prompt.toLowerCase().includes('predictive') || prompt.toLowerCase().includes('maintenance')) {
      return mockResponses.predictive;
    }

    return mockResponses.default;
  }

  async search(query: string, options?: { topK?: number }): Promise<GeminiResponse> {
    return this.generateContent(query, options);
  }
}

export const mockGeminiAdapter = new MockGeminiAdapter();

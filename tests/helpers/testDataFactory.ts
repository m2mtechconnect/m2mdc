/**
 * Test Data Factory
 * Provides factory functions for creating realistic test data objects
 */

import { faker } from '@faker-js/faker';

export const TestDataFactory = {
  /**
   * Generate a realistic agent/system configuration
   */
  agentConfig: (overrides = {}) => ({
    name: faker.company.catchPhrase(),
    description: faker.company.catchPhraseDescriptor(),
    status: faker.helpers.arrayElement(['draft', 'active', 'deployed', 'archived']),
    template_id: faker.helpers.arrayElement(['compliance', 'finance', 'predictive', 'healthcare']),
    config: {
      model: faker.helpers.arrayElement([
        'google/gemini-2.5-flash',
        'google/gemini-2.5-pro',
        'openai/gpt-5-mini',
      ]),
      grounding: faker.datatype.boolean(),
      temperature: faker.number.float({ min: 0, max: 1, precision: 0.1 }),
      topK: faker.number.int({ min: 1, max: 40 }),
    },
    ...overrides,
  }),

  /**
   * Generate a realistic integration
   */
  integration: (overrides = {}) => ({
    name: faker.company.name(),
    provider: faker.helpers.arrayElement(['google_drive', 'slack', 'salesforce', 'jira', 'zendesk']),
    category: faker.helpers.arrayElement(['storage', 'communication', 'crm', 'project_management']),
    status: faker.helpers.arrayElement(['connected', 'disconnected', 'error']),
    connect_method: faker.helpers.arrayElement(['oauth', 'api_key', 'zapier']),
    ...overrides,
  }),

  /**
   * Generate a realistic workflow node
   */
  workflowNode: (overrides = {}) => ({
    type: faker.helpers.arrayElement(['analyze', 'classify', 'transform', 'notify', 'decision']),
    x: faker.number.int({ min: 100, max: 800 }),
    y: faker.number.int({ min: 100, max: 600 }),
    config: {
      prompt: faker.lorem.sentence(),
      temperature: faker.number.float({ min: 0, max: 1, precision: 0.1 }),
    },
    ...overrides,
  }),

  /**
   * Generate a realistic agent run
   */
  agentRun: (overrides = {}) => {
    const status = faker.helpers.arrayElement(['completed', 'failed', 'running']);
    return {
      status,
      input: { query: faker.lorem.sentence() },
      output: status === 'completed' ? { answer: faker.lorem.paragraph() } : null,
      error: status === 'failed' ? faker.lorem.sentence() : null,
      duration_ms: faker.number.int({ min: 100, max: 5000 }),
      citations: status === 'completed' 
        ? Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ({
            source: faker.internet.url(),
            snippet: faker.lorem.sentence(),
          }))
        : [],
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      ...overrides,
    };
  },

  /**
   * Generate a realistic knowledge source
   */
  knowledgeSource: (overrides = {}) => ({
    name: faker.system.fileName(),
    description: faker.lorem.sentence(),
    tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      faker.word.noun()
    ),
    embedding_model: 'text-embedding-004',
    ...overrides,
  }),

  /**
   * Generate a realistic policy
   */
  policy: (overrides = {}) => ({
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    scope: faker.helpers.arrayElement(['system', 'org', 'user']),
    is_enabled: faker.datatype.boolean(),
    rules: {
      allowed_models: ['google/gemini-2.5-flash', 'openai/gpt-5-mini'],
      max_tokens: faker.number.int({ min: 1000, max: 100000 }),
      require_grounding: faker.datatype.boolean(),
    },
    ...overrides,
  }),

  /**
   * Generate a realistic deployment
   */
  deployment: (overrides = {}) => ({
    version: `v${faker.number.int({ min: 1, max: 10 })}`,
    status: faker.helpers.arrayElement(['pending', 'deploying', 'deployed', 'failed']),
    region: faker.helpers.arrayElement([
      'northamerica-northeast1',
      'us-central1',
      'europe-west1',
    ]),
    model: faker.helpers.arrayElement([
      'google/gemini-2.5-flash',
      'openai/gpt-5-mini',
    ]),
    grounding: faker.datatype.boolean(),
    health: faker.helpers.arrayElement(['healthy', 'degraded', 'down', 'unknown']),
    ...overrides,
  }),

  /**
   * Generate batch data for load testing
   */
  batch: {
    agents: (count: number, baseOverrides = {}) =>
      Array.from({ length: count }, () => TestDataFactory.agentConfig(baseOverrides)),
    
    integrations: (count: number, baseOverrides = {}) =>
      Array.from({ length: count }, () => TestDataFactory.integration(baseOverrides)),
    
    runs: (count: number, baseOverrides = {}) =>
      Array.from({ length: count }, () => TestDataFactory.agentRun(baseOverrides)),
    
    knowledgeSources: (count: number, baseOverrides = {}) =>
      Array.from({ length: count }, () => TestDataFactory.knowledgeSource(baseOverrides)),
  },
};

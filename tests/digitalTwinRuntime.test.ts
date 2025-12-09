/**
 * Digital Twin Runtime Tests
 * Tests the core runtime execution logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTwinEvent, loadDigitalTwinById } from '../src/lib/digitalTwin/runtime';
import { DigitalTwinConfig } from '../src/types/digitalTwin';

// Mock Supabase client
vi.mock('../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-twin-id',
              name: 'Test Twin',
              slug: 'test-twin',
              config: createTestConfig(),
            },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        error: null,
      })),
    })),
  },
}));

// Mock LLM client
vi.mock('../src/lib/llm/client', () => ({
  makeAICompletion: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: 'AI decision: Approved',
          role: 'assistant',
        },
        finish_reason: 'stop',
      },
    ],
  })),
}));

// Mock logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Create a test Digital Twin configuration
 */
function createTestConfig(): DigitalTwinConfig {
  return {
    version: '1.0.0',
    entities: [
      {
        id: 'entity-1',
        type: 'system',
        name: 'Test System',
        properties: {},
      },
    ],
    events: [
      {
        id: 'event-1',
        type: 'workflow_trigger',
        name: 'Test Event',
        triggers: ['node-1'],
      },
    ],
    workflow: {
      entryPoint: 'node-1',
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          name: 'Event Entry',
          description: 'Initialize workflow',
          config: {},
          nextNodes: ['node-2'],
        },
        {
          id: 'node-2',
          type: 'action',
          name: 'AI Decision',
          description: 'Make an AI-powered decision',
          config: {
            prompt: 'Analyze the event',
          },
          nextNodes: ['node-3'],
        },
        {
          id: 'node-3',
          type: 'transform',
          name: 'Update State',
          description: 'Update workflow state',
          config: {
            stateUpdates: {
              processed: true,
              timestamp: '2024-01-01T00:00:00Z',
            },
          },
          nextNodes: ['node-4'],
        },
        {
          id: 'node-4',
          type: 'end',
          name: 'Send Notification',
          description: 'Notify completion',
          config: {
            recipient: 'admin',
            message: 'Workflow completed',
          },
        },
      ],
    },
    settings: {
      enableLogging: true,
      enableMetrics: true,
    },
  };
}

describe('Digital Twin Runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load a digital twin by ID', async () => {
    const config = await loadDigitalTwinById('test-twin-id');

    expect(config).toBeDefined();
    expect(config.version).toBe('1.0.0');
    expect(config.entities).toHaveLength(1);
    expect(config.workflow.nodes).toHaveLength(4);
  });

  it('should execute a simple twin workflow', async () => {
    const result = await runTwinEvent({
      twinId: 'test-twin-id',
      eventId: 'test-event-1',
      payload: {
        type: 'test',
        data: { message: 'Hello' },
      },
    });

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.twinId).toBe('test-twin-id');
    expect(result.eventId).toBe('test-event-1');
    expect(result.runId).toBeDefined();

    // Verify logs were captured
    expect(result.logs).toBeDefined();
    expect(result.logs.length).toBeGreaterThan(0);

    // Verify all nodes were executed
    const nodeIds = result.logs.map((log) => log.nodeId);
    expect(nodeIds).toContain('node-1'); // Event Entry
    expect(nodeIds).toContain('node-2'); // AI Decision
    expect(nodeIds).toContain('node-3'); // State Update
    expect(nodeIds).toContain('node-4'); // Notification

    // Verify state changes
    expect(result.stateChanges).toBeDefined();
    expect(result.stateChanges.length).toBeGreaterThan(0);
  });

  it('should capture errors and return failed status', async () => {
    // Mock a failure in the Supabase client
    const { supabase } = await import('../src/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: 'Twin not found' },
          })),
        })),
      })),
    } as any);

    const result = await runTwinEvent({
      twinId: 'non-existent-twin',
      eventId: 'test-event-1',
      payload: {},
    });

    expect(result.status).toBe('failed');
    expect(result.logs).toBeDefined();
    expect(result.logs[0].level).toBe('error');
    expect(result.logs[0].message).toContain('Failed to load digital twin');
  });

  it('should handle human approval nodes', async () => {
    // Mock config with human approval node
    const configWithHuman: DigitalTwinConfig = {
      ...createTestConfig(),
      workflow: {
        entryPoint: 'node-1',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            name: 'Event Entry',
            config: {},
            nextNodes: ['node-2'],
          },
          {
            id: 'node-2',
            type: 'human_in_loop',
            name: 'Approval Required',
            description: 'Needs human approval',
            config: {},
            humanInLoop: {
              type: 'approval',
              assignedTo: 'manager',
              instructions: 'Please review and approve',
            },
          },
        ],
      },
    };

    const { supabase } = await import('../src/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-twin-id',
              config: configWithHuman,
            },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({ error: null })),
    } as any);

    const result = await runTwinEvent({
      twinId: 'test-twin-id',
      eventId: 'test-event-1',
      payload: {},
    });

    expect(result.status).toBe('pending_human');
    expect(result.humanTasks).toBeDefined();
    expect(result.humanTasks!.length).toBeGreaterThan(0);
    expect(result.humanTasks![0].role).toBe('manager');
  });

  it('should validate that logs contain timestamps and node IDs', async () => {
    const result = await runTwinEvent({
      twinId: 'test-twin-id',
      eventId: 'test-event-1',
      payload: {},
    });

    for (const log of result.logs) {
      expect(log.nodeId).toBeDefined();
      expect(log.message).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(new Date(log.timestamp).getTime()).toBeGreaterThan(0);
    }
  });

  it('should handle rule-based decisions', async () => {
    const configWithRules: DigitalTwinConfig = {
      ...createTestConfig(),
      workflow: {
        entryPoint: 'node-1',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            name: 'Event Entry',
            config: {},
            nextNodes: ['node-2'],
          },
          {
            id: 'node-2',
            type: 'decision',
            name: 'Rule Check',
            description: 'Evaluate rules',
            config: {
              rules: [
                {
                  field: 'data.amount',
                  operator: 'gt',
                  value: 100,
                  action: 'approve',
                },
              ],
            },
          },
        ],
      },
    };

    const { supabase } = await import('../src/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-twin-id',
              config: configWithRules,
            },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({ error: null })),
    } as any);

    const result = await runTwinEvent({
      twinId: 'test-twin-id',
      eventId: 'test-event-1',
      payload: {
        data: { amount: 150 },
      },
    });

    expect(result.status).toBe('completed');
    const ruleLog = result.logs.find((log) => log.message.includes('Rule matched'));
    expect(ruleLog).toBeDefined();
  });
});

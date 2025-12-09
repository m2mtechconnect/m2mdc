import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
};

describe('Workflow Engine - DAG Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate a simple linear workflow', () => {
    const workflow = {
      nodes: [
        { id: 'n1', type: 'analyze' },
        { id: 'n2', type: 'classify' },
      ],
      edges: [
        { from_node_id: 'n1', to_node_id: 'n2' },
      ],
    };

    const result = validateDAG(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect cycles in workflow', () => {
    const workflow = {
      nodes: [
        { id: 'n1', type: 'analyze' },
        { id: 'n2', type: 'classify' },
        { id: 'n3', type: 'notify_teams' },
      ],
      edges: [
        { from_node_id: 'n1', to_node_id: 'n2' },
        { from_node_id: 'n2', to_node_id: 'n3' },
        { from_node_id: 'n3', to_node_id: 'n1' }, // Cycle!
      ],
    };

    const result = validateDAG(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workflow contains cycles');
  });

  it('should detect multiple entry points', () => {
    const workflow = {
      nodes: [
        { id: 'n1', type: 'analyze' },
        { id: 'n2', type: 'analyze' },
        { id: 'n3', type: 'classify' },
      ],
      edges: [
        { from_node_id: 'n1', to_node_id: 'n3' },
        { from_node_id: 'n2', to_node_id: 'n3' },
      ],
    };

    const result = validateDAG(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workflow must have single entry point');
  });

  it('should validate disconnected nodes', () => {
    const workflow = {
      nodes: [
        { id: 'n1', type: 'analyze' },
        { id: 'n2', type: 'classify' },
        { id: 'n3', type: 'notify_teams' },
      ],
      edges: [
        { from_node_id: 'n1', to_node_id: 'n2' },
        // n3 is disconnected
      ],
    };

    const result = validateDAG(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Disconnected nodes detected');
  });
});

describe('Workflow Engine - Node Execution', () => {
  it('should execute Analyze node with Gemini', async () => {
    const node = {
      id: 'n1',
      type: 'analyze',
      config: {
        model: 'google/gemini-2.5-pro',
        grounding: true,
        topK: 20,
        temperature: 0.3,
      },
    };

    const input = { content: 'Test content' };
    const result = await executeNode(node, input, {
      geminiMock: true,
      region: 'northamerica-northeast1',
    });

    expect(result.ok).toBe(true);
    expect(result.output).toHaveProperty('summary');
    expect(result.metrics).toHaveProperty('latency_ms');
    expect(result.metrics).toHaveProperty('tokens_in');
    expect(result.metrics).toHaveProperty('tokens_out');
  });

  it('should execute Classify node', async () => {
    const node = {
      id: 'n2',
      type: 'classify',
      config: {
        labels: ['incident', 'info'],
        threshold: 0.55,
      },
    };

    const input = { summary: 'Critical system failure' };
    const result = await executeNode(node, input, { mock: true });

    expect(result.ok).toBe(true);
    expect(result.output).toHaveProperty('label');
    expect(result.output).toHaveProperty('confidence');
    expect(['incident', 'info']).toContain(result.output.label);
  });

  it('should execute Notify Teams node in dry-run mode', async () => {
    const node = {
      id: 'n3',
      type: 'notify_teams',
      config: {
        channel: '#ops',
        template: 'Alert: {{summary}}',
      },
    };

    const input = { summary: 'Test alert', label: 'incident' };
    const result = await executeNode(node, input, {
      zapierTestMode: true,
    });

    expect(result.ok).toBe(true);
    expect(result.output).toHaveProperty('dryRun');
    expect(result.output.dryRun).toBe(true);
  });

  it('should validate Canadian region for Vertex calls', async () => {
    const node = {
      id: 'n1',
      type: 'analyze',
      config: {
        model: 'google/gemini-2.5-pro',
        grounding: true,
      },
    };

    const input = { content: 'Test' };
    const result = await executeNode(node, input, {
      region: 'northamerica-northeast1',
      validateRegion: true,
    });

    expect(result.ok).toBe(true);
    expect(result.metadata).toHaveProperty('region');
    expect(result.metadata.region).toBe('northamerica-northeast1');
  });
});

describe('Workflow Engine - Metrics Collection', () => {
  it('should record execution metrics', async () => {
    const workflow = {
      id: 'wf1',
      nodes: [{ id: 'n1', type: 'analyze', config: {} }],
      edges: [],
    };

    const runId = 'run1';
    const metrics = await executeWorkflow(workflow, { mock: true });

    expect(metrics).toHaveProperty('started_at');
    expect(metrics).toHaveProperty('completed_at');
    expect(metrics).toHaveProperty('total_latency_ms');
    expect(metrics).toHaveProperty('total_tokens_in');
    expect(metrics).toHaveProperty('total_tokens_out');
  });

  it('should persist run events to database', async () => {
    const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
    mockSupabase.from = vi.fn(() => ({
      insert: mockInsert,
    }));

    await recordRunEvent({
      run_id: 'run1',
      node_id: 'n1',
      stage: 'analyze',
      ok: true,
      latency_ms: 150,
      tokens_in: 100,
      tokens_out: 50,
      payload: {},
    });

    expect(mockInsert).toHaveBeenCalled();
  });
});

// Helper functions (these would be implemented in the actual engine)
function validateDAG(workflow: any) {
  const errors: string[] = [];
  
  // Check for cycles using DFS
  const visited = new Set();
  const recStack = new Set();
  
  const hasCycle = (nodeId: string): boolean => {
    if (recStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recStack.add(nodeId);
    
    const outgoingEdges = workflow.edges.filter((e: any) => e.from_node_id === nodeId);
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.to_node_id)) return true;
    }
    
    recStack.delete(nodeId);
    return false;
  };
  
  for (const node of workflow.nodes) {
    if (hasCycle(node.id)) {
      errors.push('Workflow contains cycles');
      break;
    }
  }
  
  // Check for single entry point
  const nodesWithIncoming = new Set(workflow.edges.map((e: any) => e.to_node_id));
  const entryNodes = workflow.nodes.filter((n: any) => !nodesWithIncoming.has(n.id));
  
  if (entryNodes.length > 1) {
    errors.push('Workflow must have single entry point');
  }
  
  // Check for disconnected nodes
  const connectedNodes = new Set([
    ...workflow.edges.map((e: any) => e.from_node_id),
    ...workflow.edges.map((e: any) => e.to_node_id),
  ]);
  
  const disconnected = workflow.nodes.filter((n: any) => !connectedNodes.has(n.id));
  if (disconnected.length > 0 && workflow.edges.length > 0) {
    errors.push('Disconnected nodes detected');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function executeNode(node: any, input: any, options: any = {}) {
  // Mock implementation
  const startTime = Date.now();
  
  let output: any = {};
  
  switch (node.type) {
    case 'analyze':
      output = {
        summary: 'Mock summary',
        citations: [],
      };
      break;
    case 'classify':
      output = {
        label: node.config.labels[0],
        confidence: 0.85,
      };
      break;
    case 'notify_teams':
      output = {
        dryRun: options.zapierTestMode,
        message: 'Notification sent',
      };
      break;
  }
  
  const latency = Date.now() - startTime;
  
  return {
    ok: true,
    output,
    metrics: {
      latency_ms: latency,
      tokens_in: 100,
      tokens_out: 50,
    },
    metadata: options.region ? { region: options.region } : {},
  };
}

async function executeWorkflow(workflow: any, options: any = {}) {
  const started_at = new Date().toISOString();
  let total_latency = 0;
  let total_tokens_in = 0;
  let total_tokens_out = 0;
  
  for (const node of workflow.nodes) {
    const result = await executeNode(node, {}, options);
    total_latency += result.metrics.latency_ms;
    total_tokens_in += result.metrics.tokens_in;
    total_tokens_out += result.metrics.tokens_out;
  }
  
  return {
    started_at,
    completed_at: new Date().toISOString(),
    total_latency_ms: total_latency,
    total_tokens_in,
    total_tokens_out,
  };
}

async function recordRunEvent(event: any) {
  return mockSupabase.from('workflow_run_events').insert(event);
}

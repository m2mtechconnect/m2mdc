import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  DEFAULT_INTELLIGENCE_CONFIG,
  DEFAULT_TOOLS_CONFIG,
  DEFAULT_WORKFLOW_CONFIG,
  DEFAULT_DEPLOY_CONFIG,
  createEmptyBuilderState
} from '@/types/builderTypes';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } } })
    }
  }
}));

describe('BuilderTypes', () => {
  describe('DEFAULT_INTELLIGENCE_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_INTELLIGENCE_CONFIG.provider).toBe('google');
      expect(DEFAULT_INTELLIGENCE_CONFIG.model).toBe('google/gemini-2.5-flash');
      expect(DEFAULT_INTELLIGENCE_CONFIG.temperature).toBe(0.7);
      expect(DEFAULT_INTELLIGENCE_CONFIG.supervisorEnabled).toBe(false);
      expect(DEFAULT_INTELLIGENCE_CONFIG.deepResearchEnabled).toBe(false);
      expect(DEFAULT_INTELLIGENCE_CONFIG.hallucinationPrevention).toBe(true);
      expect(DEFAULT_INTELLIGENCE_CONFIG.knowledgeRestrictions).toBe(true);
      expect(DEFAULT_INTELLIGENCE_CONFIG.memoryType).toBe('short');
    });

    it('has empty knowledge sources by default', () => {
      expect(DEFAULT_INTELLIGENCE_CONFIG.knowledgeSources).toEqual([]);
      expect(DEFAULT_INTELLIGENCE_CONFIG.ragEnabled).toBe(false);
    });
  });

  describe('DEFAULT_TOOLS_CONFIG', () => {
    it('has empty arrays by default', () => {
      expect(DEFAULT_TOOLS_CONFIG.tools).toEqual([]);
      expect(DEFAULT_TOOLS_CONFIG.mcpServers).toEqual([]);
      expect(DEFAULT_TOOLS_CONFIG.apiConnectors).toEqual([]);
    });
  });

  describe('DEFAULT_WORKFLOW_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_WORKFLOW_CONFIG.name).toBe('Primary Workflow');
      expect(DEFAULT_WORKFLOW_CONFIG.triggerType).toBe('manual');
      expect(DEFAULT_WORKFLOW_CONFIG.isValid).toBe(false);
      expect(DEFAULT_WORKFLOW_CONFIG.validationErrors).toContain('At least one action is required');
    });

    it('has empty arrays for workflow components', () => {
      expect(DEFAULT_WORKFLOW_CONFIG.triggers).toEqual([]);
      expect(DEFAULT_WORKFLOW_CONFIG.actions).toEqual([]);
      expect(DEFAULT_WORKFLOW_CONFIG.integrations).toEqual([]);
      expect(DEFAULT_WORKFLOW_CONFIG.hitl).toEqual([]);
      expect(DEFAULT_WORKFLOW_CONFIG.nodes).toEqual([]);
      expect(DEFAULT_WORKFLOW_CONFIG.edges).toEqual([]);
    });
  });

  describe('DEFAULT_DEPLOY_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_DEPLOY_CONFIG.environment).toBe('dev');
      expect(DEFAULT_DEPLOY_CONFIG.currentVersion).toBe('1.0.0');
      expect(DEFAULT_DEPLOY_CONFIG.auditEnabled).toBe(true);
      expect(DEFAULT_DEPLOY_CONFIG.rbacRoles).toContain('admin');
      expect(DEFAULT_DEPLOY_CONFIG.rbacRoles).toContain('operator');
      expect(DEFAULT_DEPLOY_CONFIG.rbacRoles).toContain('viewer');
    });

    it('has empty arrays for configurable items', () => {
      expect(DEFAULT_DEPLOY_CONFIG.kpis).toEqual([]);
      expect(DEFAULT_DEPLOY_CONFIG.governanceTags).toEqual([]);
    });
  });

  describe('createEmptyBuilderState', () => {
    it('creates a valid empty state', () => {
      const state = createEmptyBuilderState();
      
      expect(state.agentId).toBeNull();
      expect(state.builderId).toBeNull();
      expect(state.currentStep).toBe(1);
      expect(state.completedSteps).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.lastSaved).toBeNull();
      expect(state.error).toBeNull();
    });

    it('creates summary with correct structure', () => {
      const state = createEmptyBuilderState();
      
      expect(state.summary).toHaveProperty('id');
      expect(state.summary).toHaveProperty('name');
      expect(state.summary).toHaveProperty('description');
      expect(state.summary).toHaveProperty('industry');
      expect(state.summary).toHaveProperty('department');
      expect(state.summary).toHaveProperty('type');
      expect(state.summary.type).toBe('agent');
    });

    it('includes all required sections', () => {
      const state = createEmptyBuilderState();
      
      expect(state).toHaveProperty('summary');
      expect(state).toHaveProperty('intelligence');
      expect(state).toHaveProperty('tools');
      expect(state).toHaveProperty('workflow');
      expect(state).toHaveProperty('deploy');
      expect(state).toHaveProperty('simulationHistory');
      expect(state).toHaveProperty('versionHistory');
    });
  });
});

describe('BuilderTool type', () => {
  it('supports integration type', () => {
    const tool = {
      id: 'slack-1',
      type: 'integration' as const,
      name: 'Slack',
      category: 'Communication',
      enabled: true,
      connected: false,
      config: {}
    };
    
    expect(tool.type).toBe('integration');
    expect(tool.enabled).toBe(true);
    expect(tool.connected).toBe(false);
  });

  it('supports mcp type', () => {
    const tool = {
      id: 'mcp-1',
      type: 'mcp' as const,
      name: 'File Browser',
      enabled: true,
      connected: true,
      config: { serverUrl: 'http://localhost:3000' }
    };
    
    expect(tool.type).toBe('mcp');
  });

  it('supports api type', () => {
    const tool = {
      id: 'api-1',
      type: 'api' as const,
      name: 'Custom API',
      enabled: true,
      connected: true,
      config: { endpoint: 'https://api.example.com', method: 'POST' }
    };
    
    expect(tool.type).toBe('api');
  });
});

describe('BuilderKPI type', () => {
  it('supports increase direction', () => {
    const kpi = {
      code: 'revenue',
      label: 'Revenue Growth',
      unit: '$',
      baseline: 100000,
      target: 150000,
      direction: 'increase' as const
    };
    
    expect(kpi.direction).toBe('increase');
    expect(kpi.target).toBeGreaterThan(kpi.baseline);
  });

  it('supports decrease direction', () => {
    const kpi = {
      code: 'costs',
      label: 'Operating Costs',
      unit: '$',
      baseline: 50000,
      target: 40000,
      direction: 'decrease' as const
    };
    
    expect(kpi.direction).toBe('decrease');
    expect(kpi.target).toBeLessThan(kpi.baseline);
  });
});

describe('BuilderWorkflowNode type', () => {
  it('has required properties', () => {
    const node = {
      id: 'node-1',
      type: 'analyze',
      label: 'Analyze Input',
      position: { x: 100, y: 200 },
      config: { model: 'google/gemini-2.5-flash' },
      inputs: ['trigger'],
      outputs: ['classify']
    };
    
    expect(node.id).toBeDefined();
    expect(node.type).toBeDefined();
    expect(node.position.x).toBe(100);
    expect(node.position.y).toBe(200);
  });
});

describe('BuilderSimulationRun type', () => {
  it('supports all status values', () => {
    const statuses = ['pending', 'running', 'completed', 'failed'] as const;
    
    statuses.forEach(status => {
      const run = {
        id: `run-${status}`,
        scenario: 'Test scenario',
        status,
        duration: 1000,
        timestamp: new Date(),
        events: 5,
        latency: 200
      };
      
      expect(run.status).toBe(status);
    });
  });
});

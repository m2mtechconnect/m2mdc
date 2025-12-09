/**
 * Integration test for template loading via URL parameter
 * Tests the flow: URL with templateId → load template → convert to blueprint → hydrate builder
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { loadAllTemplates } from '@/lib/templateLoader';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-db-template',
              name: 'Database Template',
              description: 'Template from database',
              industry: 'Healthcare',
              default_config: {
                department: 'Operations',
                type: 'process_twin',
                goals: ['Reduce processing time'],
                selectedModel: 'google/gemini-2.5-flash',
                systemPrompt: 'Test system prompt',
                connectors: ['email', 'slack'],
                workflowNodes: [
                  { type: 'trigger', name: 'Start' },
                  { type: 'action', name: 'Process' }
                ]
              }
            },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('Template URL Loading Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear stores
    useWizardBuilderStore.getState().reset();
    useBlueprintStore.getState().clearBlueprint();
  });

  it('should detect templateId in URL and load from JSON', async () => {
    const { result } = renderHook(() => useWizardBuilderStore());
    
    // Create URLSearchParams with templateId
    const params = new URLSearchParams({
      templateId: 'retail_inventory_optimization',
      step: '1'
    });

    // Initialize builder with templateId in params
    await result.current.initializeBuilder(params);

    // Check that blueprint was created and stored
    const blueprint = useBlueprintStore.getState().currentBlueprint;
    
    expect(blueprint).not.toBeNull();
    expect(blueprint?.source).toBe('template');
    expect(blueprint?.templateId).toBe('retail_inventory_optimization');
    
    // Check that builder state was hydrated
    const state = useWizardBuilderStore.getState();
    expect(state.builderId).not.toBeNull();
    expect(state.goal).not.toBe('');
    expect(state.industry).not.toBe('');
  });

  it('should fall back to database if template not in JSON', async () => {
    const { result } = renderHook(() => useWizardBuilderStore());
    
    // Use a template ID that doesn't exist in JSON
    const params = new URLSearchParams({
      templateId: 'non-existent-template',
      step: '1'
    });

    await result.current.initializeBuilder(params);

    // Should have loaded from database mock
    const blueprint = useBlueprintStore.getState().currentBlueprint;
    
    expect(blueprint).not.toBeNull();
    expect(blueprint?.source).toBe('template');
  });

  it('should handle missing template gracefully', async () => {
    // Mock database to return error
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { message: 'Not found' }
              }))
            }))
          }))
        }))
      }
    }));

    const { result } = renderHook(() => useWizardBuilderStore());
    
    const params = new URLSearchParams({
      templateId: 'truly-non-existent',
      step: '1'
    });

    await result.current.initializeBuilder(params);

    // Should show error but not crash
    const state = useWizardBuilderStore.getState();
    expect(state.error).toContain('not found');
  });

  it('should prioritize blueprint over templateId', async () => {
    const mockBlueprint = {
      source: 'template' as const,
      sourceEntry: 'marketplace' as const,
      templateId: 'existing-blueprint',
      name: 'Existing Blueprint',
      description: 'Already loaded',
      industry: 'Finance',
      department: 'IT',
      type: 'agent' as const,
      model: {
        provider: 'google',
        modelName: 'google/gemini-2.5-flash',
        temperature: 0.7,
        topK: 20,
        topP: 0.95
      },
      knowledge: {
        documents: [],
        urls: [],
        cloudDrives: {},
        summary: null
      },
      behavior: {
        systemPrompt: '',
        personaTemplate: null,
        communicationStyle: {
          formal: true,
          emojis: false,
          detailedExplanations: true
        },
        safety: {
          hallucinationPrevention: true,
          knowledgeRestrictions: true,
          requireCitations: true
        }
      },
      tools: {
        recommendedIntegrations: [],
        preselectedIntegrations: [],
        customApis: []
      },
      workflow: {
        templateType: 'auto' as const,
        triggers: [],
        actions: [],
        integrations: []
      },
      goals: [],
      expectedRoi: null,
      timeSavedPerWeek: null,
      efficiencyGain: null,
      tags: []
    };

    const { result } = renderHook(() => useWizardBuilderStore());
    
    const params = new URLSearchParams({
      templateId: 'different-template',
      step: '1'
    });

    // Pass blueprint directly (simulates clicking "Use Template" button)
    await result.current.initializeBuilder(params, undefined, undefined, mockBlueprint);

    // Should use the passed blueprint, not load templateId
    const state = useWizardBuilderStore.getState();
    expect(state.goal).toBe('Already loaded');
  });

  it('should convert template to builder state correctly', async () => {
    const { result } = renderHook(() => useWizardBuilderStore());
    
    const params = new URLSearchParams({
      templateId: 'retail_inventory_optimization',
      step: '1'
    });

    await result.current.initializeBuilder(params);

    const state = useWizardBuilderStore.getState();
    const blueprint = useBlueprintStore.getState().currentBlueprint;

    // Verify all key fields are populated
    expect(state.builderId).not.toBeNull();
    expect(state.goal).not.toBe('');
    expect(state.industry).not.toBe('');
    expect(state.modelConfig.model).toBeTruthy();
    expect(state.workflow).toBeDefined();
    
    // Verify blueprint matches store state
    expect(blueprint?.name).toBe(state.goal);
    expect(blueprint?.industry).toBe(state.industry);
  });

  it('should set correct currentStep based on step param', async () => {
    const { result } = renderHook(() => useWizardBuilderStore());
    
    // Test different step values
    for (const step of ['1', '2', '3', '4', '5']) {
      useWizardBuilderStore.getState().reset();
      useBlueprintStore.getState().clearBlueprint();

      const params = new URLSearchParams({
        templateId: 'retail_inventory_optimization',
        step
      });

      await result.current.initializeBuilder(params);

      const state = useWizardBuilderStore.getState();
      expect(state.currentStep).toBe(parseInt(step, 10));
    }
  });

  it('should load all available templates from JSON', () => {
    const templates = loadAllTemplates();
    
    expect(templates.length).toBeGreaterThan(0);
    
    // Verify key templates exist
    const inventoryTemplate = templates.find(t => t.id === 'retail_inventory_optimization');
    expect(inventoryTemplate).toBeDefined();
    expect(inventoryTemplate?.name).toBeTruthy();
    expect(inventoryTemplate?.twin_type).toBeTruthy();
  });

  it('should handle concurrent templateId loads', async () => {
    const { result } = renderHook(() => useWizardBuilderStore());
    
    const params1 = new URLSearchParams({ templateId: 'retail_inventory_optimization', step: '1' });
    const params2 = new URLSearchParams({ templateId: 'retail_inventory_optimization', step: '2' });

    // Start both loads simultaneously
    const [load1, load2] = await Promise.all([
      result.current.initializeBuilder(params1),
      result.current.initializeBuilder(params2)
    ]);

    // Should handle gracefully without crashes
    const state = useWizardBuilderStore.getState();
    expect(state.error).toBeNull();
    expect(state.builderId).not.toBeNull();
  });
});

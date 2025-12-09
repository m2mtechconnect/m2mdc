import { describe, it, expect } from 'vitest';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
} from '@/lib/builderValidation';
import { BuilderState } from '@/stores/builderStore';

describe('Builder Validation', () => {
  const createMockState = (overrides: Partial<BuilderState> = {}): BuilderState => ({
    systemName: 'Test System',
    department: 'Operations',
    outcome: 'Test outcome description',
    successMetric: 'Test success metric',
    selectedTemplate: null,
    connectors: {},
    knowledgeSources: [],
    selectedModel: 'google/gemini-2.5-flash',
    topK: 10,
    topN: 5,
    temperature: 0.7,
    systemPrompt: 'Test system prompt',
    geminiEnabled: true,
    vertexEnabled: true,
    hybridSearch: false,
    workflowNodes: [],
    roiAssumptions: {
      timeSavedPerRunMin: 30,
      runsPerWeek: 40,
      loadedCostPerHour: 75,
      accuracyGain: 0.35,
      errorCost: 500,
    },
    ...overrides,
  });

  describe('Step 1 Validation', () => {
    it('should pass with valid inputs', () => {
      const state = createMockState();
      const result = validateStep1(state);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with empty system name', () => {
      const state = createMockState({ systemName: '' });
      const result = validateStep1(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'systemName',
          message: expect.stringContaining('System name is required'),
        })
      );
    });

    it('should fail with system name too short', () => {
      const state = createMockState({ systemName: 'AB' });
      const result = validateStep1(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at least 3 characters');
    });

    it('should fail with system name too long', () => {
      const state = createMockState({ 
        systemName: 'A'.repeat(81) 
      });
      const result = validateStep1(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('80 characters');
    });

    it('should fail without department', () => {
      const state = createMockState({ department: '' });
      const result = validateStep1(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'department',
        })
      );
    });

    it('should fail with short outcome', () => {
      const state = createMockState({ outcome: 'Short' });
      const result = validateStep1(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at least 10 characters');
    });

    it('should fail with empty success metric', () => {
      const state = createMockState({ successMetric: '' });
      const result = validateStep1(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'successMetric',
        })
      );
    });
  });

  describe('Step 2 Validation', () => {
    it('should pass even without template selected', () => {
      const state = createMockState({ selectedTemplate: null });
      const result = validateStep2(state);
      
      expect(result.valid).toBe(true);
    });

    it('should pass with template selected', () => {
      const state = createMockState({ selectedTemplate: 'compliance' });
      const result = validateStep2(state);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Step 3 Validation', () => {
    it('should pass with no template requirements', () => {
      const state = createMockState();
      const result = validateStep3(state, undefined);
      
      expect(result.valid).toBe(true);
    });

    it('should fail when template requires grounding but no sources', () => {
      const state = createMockState({ 
        knowledgeSources: [],
        vertexEnabled: true 
      });
      
      const template = {
        id: 'compliance',
        name: 'Compliance',
        category: 'Operations',
        description: 'Test',
        icon: 'shield',
        defaults: { grounding: true },
      };
      
      const result = validateStep3(state, template);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('knowledge source');
    });

    it('should pass when template requires grounding and sources exist', () => {
      const state = createMockState({
        knowledgeSources: [{ id: 'ks-1', name: 'Test Doc', type: 'file', status: 'indexed' }],
        vertexEnabled: true
      });
      
      const template = {
        id: 'compliance',
        name: 'Compliance',
        category: 'Operations',
        description: 'Test',
        icon: 'shield',
        defaults: { grounding: true },
      };
      
      const result = validateStep3(state, template);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Step 4 Validation', () => {
    it('should pass with valid AI configuration', () => {
      const state = createMockState();
      const result = validateStep4(state);
      
      expect(result.valid).toBe(true);
    });

    it('should fail without model selected', () => {
      const state = createMockState({ selectedModel: '' });
      const result = validateStep4(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('AI model');
    });

    it('should fail without system prompt', () => {
      const state = createMockState({ systemPrompt: '' });
      const result = validateStep4(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('System prompt');
    });

    it('should fail with invalid temperature', () => {
      const state = createMockState({ temperature: 2.5 });
      const result = validateStep4(state);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Temperature');
    });

    it('should fail with invalid topK', () => {
      const state = createMockState({ topK: 0 });
      const result = validateStep4(state);
      
      expect(result.valid).toBe(false);
    });

    it('should fail with invalid topN', () => {
      const state = createMockState({ topN: 25 });
      const result = validateStep4(state);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Step 5 Validation (Workflow)', () => {
    it('should pass with valid workflow', () => {
      const state = createMockState({
        workflowNodes: [
          { id: 'n1', type: 'analyze', x: 0, y: 0, config: { model: 'gemini' } },
          { id: 'n2', type: 'classify', x: 100, y: 0, config: { labels: ['A', 'B'] } }
        ]
      });
      
      expect(state.workflowNodes.length).toBeGreaterThan(0);
    });
  });
});

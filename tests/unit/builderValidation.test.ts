import { describe, it, expect } from 'vitest';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
} from '@/lib/builderValidation';
import { BuilderState } from '@/stores/builderStore';

/**
 * Step semantics follow the current builder:
 *   1 Define Goal, 2 Choose Template, 3 Configure Intelligence,
 *   4 Connect Business Systems.
 * Outcome and success metric are optional on step 1.
 */
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
  } as BuilderState);

  describe('Step 1 - Define Goal', () => {
    it('should pass with valid inputs', () => {
      const result = validateStep1(createMockState());

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with empty system name', () => {
      const result = validateStep1(createMockState({ systemName: '' }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'systemName' })
      );
    });

    it('should fail with system name too short', () => {
      const result = validateStep1(createMockState({ systemName: 'AB' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at least 3 characters');
    });

    it('should fail with system name too long', () => {
      const result = validateStep1(createMockState({ systemName: 'A'.repeat(81) }));

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('80 characters');
    });

    it('should fail without department', () => {
      const result = validateStep1(createMockState({ department: '' }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'department' })
      );
    });

    it('should pass without an outcome or success metric', () => {
      const result = validateStep1(createMockState({ outcome: '', successMetric: '' }));

      expect(result.valid).toBe(true);
    });
  });

  describe('Step 2 - Choose Template', () => {
    it('should pass even without template selected', () => {
      expect(validateStep2(createMockState({ selectedTemplate: null })).valid).toBe(true);
    });

    it('should pass with template selected', () => {
      expect(validateStep2(createMockState({ selectedTemplate: 'compliance' })).valid).toBe(true);
    });
  });

  describe('Step 3 - Configure Intelligence', () => {
    it('should pass with valid AI configuration', () => {
      expect(validateStep3(createMockState()).valid).toBe(true);
    });

    it('should fail without model selected', () => {
      const result = validateStep3(createMockState({ selectedModel: '' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('AI model');
    });

    it('should fail without system prompt', () => {
      const result = validateStep3(createMockState({ systemPrompt: '' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('systemPrompt');
    });

    it('should fail with invalid temperature', () => {
      const result = validateStep3(createMockState({ temperature: 2.5 }));

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('temperature');
    });

    it('should fail with invalid topK', () => {
      expect(validateStep3(createMockState({ topK: 0 })).valid).toBe(false);
    });

    it('should fail with invalid topN', () => {
      expect(validateStep3(createMockState({ topN: 25 })).valid).toBe(false);
    });

    it('should fail when no AI engine is enabled', () => {
      const result = validateStep3(
        createMockState({ geminiEnabled: false, vertexEnabled: false })
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('aiEngines');
    });
  });

  describe('Step 4 - Connect Business Systems', () => {
    it('should pass with no template requirements', () => {
      expect(validateStep4(createMockState(), undefined).valid).toBe(true);
    });

    it('should fail when the template requires an unconnected integration', () => {
      const template = {
        id: 'compliance',
        name: 'Compliance',
        requiredIntegrations: [{ id: 'sharepoint', name: 'SharePoint' }],
      };

      const result = validateStep4(createMockState({ connectors: {} }), template);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('SharePoint');
    });

    it('should pass when the required integration is connected', () => {
      const template = {
        id: 'compliance',
        name: 'Compliance',
        requiredIntegrations: [{ id: 'sharepoint', name: 'SharePoint' }],
      };

      const result = validateStep4(
        createMockState({ connectors: { sharepoint: 'connected' } }),
        template
      );

      expect(result.valid).toBe(true);
    });
  });
});

/**
 * Unit tests for blueprint helper functions
 * Tests openBuilderWithBlueprint and related utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blueprintToBuilderState, builderStateToBlueprint } from '@/lib/builder/blueprintHelpers';
import { questionnaireToBlueprint } from '@/lib/builder/questionnaireToBlueprint';
import { customerSupportAgentAnswers } from '../fixtures/questionnaire-answers';

describe('blueprintToBuilderState', () => {
  it('should convert blueprint to builder state format', () => {
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    const builderState = blueprintToBuilderState(blueprint);

    // Basic fields
    expect(builderState.goal).toBe(blueprint.description);
    expect(builderState.industry).toBe(blueprint.industry);
    expect(builderState.department).toBe(blueprint.department);
    expect(builderState.type).toBe(blueprint.type);

    // Model config
    expect(builderState.modelConfig?.provider).toBe(blueprint.model.provider);
    expect(builderState.modelConfig?.model).toBe(blueprint.model.modelName);

    // Workflow
    expect(builderState.workflow?.triggers).toEqual(blueprint.workflow.triggers);
    expect(builderState.workflow?.actions).toEqual(blueprint.workflow.actions);
  });

  it('should handle minimal blueprint', () => {
    const minimalBlueprint = {
      source: 'manual' as const,
      name: 'Test Agent',
      description: 'Test description',
      goals: [],
      model: {
        provider: 'gemini' as const,
        modelName: 'google/gemini-2.5-flash',
      },
      knowledge: {},
      behavior: {
        systemPrompt: 'Test prompt',
      },
      tools: {
        recommendedIntegrations: [],
      },
      workflow: {
        triggers: [],
        actions: [],
        integrations: [],
      },
    };

    const builderState = blueprintToBuilderState(minimalBlueprint as any);

    expect(builderState.goal).toBe('Test description');
    // Managed AI contract: only the stable response profile is hydrated;
    // legacy raw provider/model keys are never written for new drafts.
    expect(builderState.modelConfig?.response_profile).toBe('balanced');
    expect(builderState.modelConfig?.provider).toBeUndefined();
    expect(builderState.modelConfig?.model).toBeUndefined();
  });

  it('should map all required fields', () => {
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    const builderState = blueprintToBuilderState(blueprint);

    // Ensure all expected fields are present
    expect(builderState).toHaveProperty('goal');
    expect(builderState).toHaveProperty('industry');
    expect(builderState).toHaveProperty('department');
    expect(builderState).toHaveProperty('type');
    expect(builderState).toHaveProperty('modelConfig');
    expect(builderState).toHaveProperty('workflow');
  });
});

describe('builderStateToBlueprint', () => {
  it('should convert builder state back to blueprint format', () => {
    const builderState = {
      builderId: 'test-id',
      goal: 'Test goal',
      industry: 'Technology',
      department: 'IT',
      type: 'agent' as const,
      modelConfig: {
        response_profile: 'fast',
      },
      workflow: {
        triggers: [],
        actions: [],
        integrations: [],
      },
      currentStep: 1,
      completedSteps: [],
      isLoading: false,
      error: null,
      lastSaved: null,
    };

    const blueprint = builderStateToBlueprint(builderState as any, 'manual');

    expect(blueprint.source).toBe('manual');
    expect(blueprint.description).toBe('Test goal');
    expect(blueprint.industry).toBe('Technology');
    expect(blueprint.department).toBe('IT');
    expect(blueprint.type).toBe('agent');
    // Managed AI contract: only the stable response profile round-trips.
    expect(blueprint.model.responseProfile).toBe('fast');
    expect(blueprint.model.provider).toBeUndefined();
    expect(blueprint.model.modelName).toBeUndefined();
  });

  it('never persists legacy raw provider or model identifiers', () => {
    const builderState = {
      builderId: 'legacy-id',
      goal: 'Legacy draft',
      // Legacy readable draft keys must not be re-emitted on save.
      modelConfig: {
        provider: 'legacy-provider',
        model: 'legacy-model-id',
      },
    };

    const blueprint = builderStateToBlueprint(builderState as any, 'manual');
    expect(blueprint.model.responseProfile).toBe('balanced');
    expect(blueprint.model.provider).toBeUndefined();
    expect(blueprint.model.modelName).toBeUndefined();
  });

  it('should preserve source field', () => {
    const builderState = {
      builderId: 'test-id',
      goal: 'Test goal',
      currentStep: 1,
      completedSteps: [],
      isLoading: false,
      error: null,
      lastSaved: null,
    };

    const questionnaireBlueprint = builderStateToBlueprint(builderState as any, 'questionnaire');
    expect(questionnaireBlueprint.source).toBe('questionnaire');

    const templateBlueprint = builderStateToBlueprint(builderState as any, 'template');
    expect(templateBlueprint.source).toBe('template');

    const fileBlueprint = builderStateToBlueprint(builderState as any, 'file');
    expect(fileBlueprint.source).toBe('file');
  });
});

describe('Round-trip conversion', () => {
  it('should maintain data through blueprint -> builder state -> blueprint conversion', () => {
    const originalBlueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    // Convert to builder state
    const builderState = blueprintToBuilderState(originalBlueprint);
    
    // Convert back to blueprint
    const reconstructedBlueprint = builderStateToBlueprint(builderState as any, originalBlueprint.source);

    // Key fields should match
    expect(reconstructedBlueprint.industry).toBe(originalBlueprint.industry);
    expect(reconstructedBlueprint.department).toBe(originalBlueprint.department);
    expect(reconstructedBlueprint.type).toBe(originalBlueprint.type);
    // The stable response profile is the only model selection that round-trips.
    expect(reconstructedBlueprint.model.responseProfile).toBe(originalBlueprint.model.responseProfile);
  });
});

/**
 * Integration tests for the intake -> blueprint -> builder flow
 * Tests the interaction between multiple components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { questionnaireToBlueprint } from '@/lib/builder/questionnaireToBlueprint';
import { documentAnalysisToBlueprint } from '@/lib/builder/documentToBlueprint';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import { customerSupportAgentAnswers } from '../fixtures/questionnaire-answers';
import { smallDocumentAnalysis } from '../fixtures/document-analysis';
import { inventoryOptimizationTemplate } from '../fixtures/templates';

describe('Blueprint Store Integration', () => {
  beforeEach(() => {
    // Clear blueprint store before each test
    const { result } = renderHook(() => useBlueprintStore());
    act(() => {
      result.current.clearBlueprint();
    });
  });

  it('should store and retrieve questionnaire blueprint', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    expect(result.current.currentBlueprint).not.toBeNull();
    expect(result.current.currentBlueprint?.source).toBe('questionnaire');
    expect(result.current.currentBlueprint?.industry).toBe('Technology');
    expect(result.current.hasBlueprint()).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('should store and retrieve document analysis blueprint', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = documentAnalysisToBlueprint(smallDocumentAnalysis, 'test.pdf');
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    expect(result.current.currentBlueprint).not.toBeNull();
    expect(result.current.currentBlueprint?.source).toBe('file');
    expect(result.current.currentBlueprint?.knowledge.documents).toContain('test.pdf');
  });

  it('should store and retrieve template blueprint', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = templateToBlueprint(inventoryOptimizationTemplate);
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    expect(result.current.currentBlueprint).not.toBeNull();
    expect(result.current.currentBlueprint?.source).toBe('template');
    expect(result.current.currentBlueprint?.templateId).toBe(inventoryOptimizationTemplate.id);
  });

  it('should mark blueprint as dirty when updated', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateBlueprint({
        name: 'Updated Name',
      });
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.currentBlueprint?.name).toBe('Updated Name');
  });

  it('should deep merge nested objects on update', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    const originalProvider = result.current.currentBlueprint?.model.provider;

    act(() => {
      result.current.updateBlueprint({
        model: {
          temperature: 0.9,
        } as any,
      });
    });

    expect(result.current.currentBlueprint?.model.provider).toBe(originalProvider);
    expect(result.current.currentBlueprint?.model.temperature).toBe(0.9);
  });

  it('should clear blueprint completely', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    expect(result.current.hasBlueprint()).toBe(true);

    act(() => {
      result.current.clearBlueprint();
    });

    expect(result.current.hasBlueprint()).toBe(false);
    expect(result.current.currentBlueprint).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it('should track lastUpdated timestamp', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    const beforeSet = Date.now();
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    const afterSet = Date.now();

    expect(result.current.lastUpdated).not.toBeNull();
    const timestamp = result.current.lastUpdated!.getTime();
    expect(timestamp).toBeGreaterThanOrEqual(beforeSet);
    expect(timestamp).toBeLessThanOrEqual(afterSet);
  });
});

describe('Blueprint Persistence', () => {
  it('should persist blueprint to localStorage', () => {
    const { result } = renderHook(() => useBlueprintStore());
    
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    act(() => {
      result.current.setBlueprint(blueprint);
    });

    // Check localStorage
    const stored = localStorage.getItem('blueprint-storage');
    expect(stored).not.toBeNull();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.state.currentBlueprint.source).toBe('questionnaire');
  });

  it('should restore blueprint from localStorage', () => {
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    // Manually set in localStorage
    localStorage.setItem('blueprint-storage', JSON.stringify({
      state: { currentBlueprint: blueprint },
      version: 0,
    }));

    // Create new hook instance (simulating page reload)
    const { result } = renderHook(() => useBlueprintStore());

    expect(result.current.currentBlueprint).not.toBeNull();
    expect(result.current.currentBlueprint?.source).toBe('questionnaire');
  });
});

/**
 * Integration tests for Template → Builder flow
 * Tests the complete integration between template selection and builder hydration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { openBuilderWithTemplate } from '@/lib/builder/openBuilderWithTemplate';
import { inventoryOptimizationTemplate } from '../fixtures/templates';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock analytics
vi.mock('@/lib/analytics/intakeTracking', () => ({
  trackIntakeComplete: vi.fn(),
  trackBuilderOpened: vi.fn(),
}));

vi.mock('@/lib/telemetry', () => ({
  trackEvent: vi.fn(),
}));

describe('Template to Builder Integration', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate = vi.fn();
    
    // Clear blueprint store
    const { result } = renderHook(() => useBlueprintStore());
    act(() => {
      result.current.clearBlueprint();
    });
  });

  it('should store blueprint that builder can hydrate from', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const { result } = renderHook(() => useBlueprintStore());
    const blueprint = result.current.currentBlueprint;

    expect(blueprint).not.toBeNull();
    expect(blueprint?.source).toBe('template');
    expect(blueprint?.sourceEntry).toBe('marketplace');
    
    // Verify all fields needed for Step 1
    expect(blueprint?.name).toBeDefined();
    expect(blueprint?.description).toBeDefined();
    expect(blueprint?.industry).toBeDefined();
    expect(blueprint?.department).toBeDefined();
    expect(blueprint?.goals).toBeDefined();
    expect(blueprint?.expectedRoi).toBeDefined();
    
    // Verify all fields needed for Step 2
    expect(blueprint?.model).toBeDefined();
    expect(blueprint?.model.modelName).toBeDefined();
    expect(blueprint?.behavior.systemPrompt).toBeDefined();
    
    // Verify all fields needed for Step 3
    expect(blueprint?.tools.recommendedIntegrations).toBeDefined();
    
    // Verify all fields needed for Step 4
    expect(blueprint?.workflow).toBeDefined();
    expect(blueprint?.workflow.triggers).toBeDefined();
    expect(blueprint?.workflow.actions).toBeDefined();
  });

  it('should preserve template metadata through store', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'dashboard',
      mockNavigate
    );

    const { result } = renderHook(() => useBlueprintStore());
    const blueprint = result.current.currentBlueprint;

    expect(blueprint?.templateId).toBe(inventoryOptimizationTemplate.id);
    expect(blueprint?.templateName).toBe(inventoryOptimizationTemplate.name);
    expect(blueprint?.certified).toBe(inventoryOptimizationTemplate.certified);
    expect(blueprint?.rating).toBe(inventoryOptimizationTemplate.rating);
    expect(blueprint?.downloads).toBe(inventoryOptimizationTemplate.downloads);
  });

  it('should allow blueprint to be updated after template load', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const { result } = renderHook(() => useBlueprintStore());

    // Simulate user editing in builder
    act(() => {
      result.current.updateBlueprint({
        name: 'Customized Inventory Twin',
        description: 'Modified description',
      });
    });

    const blueprint = result.current.currentBlueprint;
    expect(blueprint?.name).toBe('Customized Inventory Twin');
    expect(blueprint?.description).toBe('Modified description');
    
    // Original template metadata should be preserved
    expect(blueprint?.templateId).toBe(inventoryOptimizationTemplate.id);
    expect(blueprint?.source).toBe('template');
    expect(blueprint?.sourceEntry).toBe('marketplace');
  });

  it('should mark blueprint as dirty when user makes changes', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const { result } = renderHook(() => useBlueprintStore());

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateBlueprint({
        name: 'Modified Name',
      });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('should persist blueprint to localStorage', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'builder',
      mockNavigate
    );

    // Check localStorage
    const stored = localStorage.getItem('blueprint-storage');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.currentBlueprint).toBeDefined();
    expect(parsed.state.currentBlueprint.source).toBe('template');
    expect(parsed.state.currentBlueprint.templateId).toBe(inventoryOptimizationTemplate.id);
  });

  it('should restore blueprint from localStorage after page reload', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    // Simulate page reload by creating new store instance
    const { result: newResult } = renderHook(() => useBlueprintStore());

    const blueprint = newResult.current.currentBlueprint;
    expect(blueprint).not.toBeNull();
    expect(blueprint?.templateId).toBe(inventoryOptimizationTemplate.id);
  });

  it('should handle concurrent template selections correctly', () => {
    // Select first template
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    let { result } = renderHook(() => useBlueprintStore());
    const firstBlueprint = result.current.currentBlueprint;
    const firstTemplateId = firstBlueprint?.templateId;

    // Immediately select different template (simulating fast clicks)
    const secondTemplate = {
      ...inventoryOptimizationTemplate,
      id: 'different-template-id',
      name: 'Different Template',
    };

    openBuilderWithTemplate(
      secondTemplate,
      'marketplace',
      mockNavigate
    );

    // Should have latest template
    result = renderHook(() => useBlueprintStore()).result;
    const secondBlueprint = result.current.currentBlueprint;

    expect(secondBlueprint?.templateId).toBe('different-template-id');
    expect(secondBlueprint?.name).toBe('Different Template');
    expect(secondBlueprint?.templateId).not.toBe(firstTemplateId);
  });

  it('should clear previous blueprint data when loading new template', () => {
    // Load first template
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const { result } = renderHook(() => useBlueprintStore());

    // Manually add some custom data
    act(() => {
      result.current.updateBlueprint({
        knowledge: {
          documents: ['custom-doc.pdf'],
        } as any,
      });
    });

    // Load new template
    const cleanTemplate = {
      ...inventoryOptimizationTemplate,
      id: 'clean-template',
      name: 'Clean Template',
    };

    openBuilderWithTemplate(
      cleanTemplate,
      'marketplace',
      mockNavigate
    );

    // Read fresh from the store: the hook snapshot can be stale after an
    // out-of-render store write.
    const newBlueprint = useBlueprintStore.getState().currentBlueprint;
    
    // Should be clean template, not have old custom data mixed in
    expect(newBlueprint?.templateId).toBe('clean-template');
    expect(newBlueprint?.knowledge.documents).not.toContain('custom-doc.pdf');
  });
});

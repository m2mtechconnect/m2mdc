/**
 * Unit tests for openBuilderWithTemplate
 * Tests the unified entry point for template → builder flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openBuilderWithTemplate } from '@/lib/builder/openBuilderWithTemplate';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { inventoryOptimizationTemplate, customerSupportTemplate } from '../fixtures/templates';
import * as intakeTracking from '@/lib/analytics/intakeTracking';
import * as telemetry from '@/lib/telemetry';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/analytics/intakeTracking', () => ({
  trackIntakeComplete: vi.fn(),
  trackBuilderOpened: vi.fn(),
}));

vi.mock('@/lib/telemetry', () => ({
  trackEvent: vi.fn(),
}));

describe('openBuilderWithTemplate', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate = vi.fn();
    
    // Clear blueprint store
    useBlueprintStore.getState().clearBlueprint();
  });

  it('should convert template to blueprint and store it', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const blueprint = useBlueprintStore.getState().currentBlueprint;
    
    expect(blueprint).not.toBeNull();
    expect(blueprint?.source).toBe('template');
    expect(blueprint?.sourceEntry).toBe('marketplace');
    expect(blueprint?.templateId).toBe(inventoryOptimizationTemplate.id);
    expect(blueprint?.templateName).toBe(inventoryOptimizationTemplate.name);
  });

  it('should navigate to builder step 1', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'dashboard',
      mockNavigate
    );

    expect(mockNavigate).toHaveBeenCalledWith('/builder?step=1');
  });

  it('should track all analytics events', () => {
    openBuilderWithTemplate(
      customerSupportTemplate,
      'builder',
      mockNavigate
    );

    // Should track template.use_template event
    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'template.use_template',
      expect.objectContaining({
        templateId: customerSupportTemplate.id,
        templateName: customerSupportTemplate.name,
        sourceEntry: 'builder',
        industry: customerSupportTemplate.industry,
      })
    );

    // Should track intake complete
    expect(intakeTracking.trackIntakeComplete).toHaveBeenCalled();
    
    // Should track builder opened
    expect(intakeTracking.trackBuilderOpened).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'template',
        sourceEntry: 'builder',
      }),
      1
    );
  });

  it('should handle different source entries correctly', () => {
    // Dashboard
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'dashboard',
      mockNavigate
    );
    
    let blueprint = useBlueprintStore.getState().currentBlueprint;
    expect(blueprint?.sourceEntry).toBe('dashboard');

    // Marketplace
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );
    
    blueprint = useBlueprintStore.getState().currentBlueprint;
    expect(blueprint?.sourceEntry).toBe('marketplace');

    // Builder (Step 2)
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'builder',
      mockNavigate
    );
    
    blueprint = useBlueprintStore.getState().currentBlueprint;
    expect(blueprint?.sourceEntry).toBe('builder');
  });

  it('should call success callback if provided', () => {
    const onSuccess = vi.fn();
    
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate,
      onSuccess
    );

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should preserve template metadata in blueprint', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const blueprint = useBlueprintStore.getState().currentBlueprint;
    
    expect(blueprint?.certified).toBe(inventoryOptimizationTemplate.certified);
    expect(blueprint?.rating).toBe(inventoryOptimizationTemplate.rating);
    expect(blueprint?.downloads).toBe(inventoryOptimizationTemplate.downloads);
    expect(blueprint?.expectedRoi).toBe(`${inventoryOptimizationTemplate.roi_pct}%`);
  });

  it('should map all template fields to blueprint', () => {
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    const blueprint = useBlueprintStore.getState().currentBlueprint;
    const config = inventoryOptimizationTemplate.default_config;
    
    // Step 1 fields
    expect(blueprint?.name).toBe(inventoryOptimizationTemplate.name);
    expect(blueprint?.description).toBe(inventoryOptimizationTemplate.description);
    expect(blueprint?.industry).toBe(inventoryOptimizationTemplate.industry);
    expect(blueprint?.department).toBe(config.department);
    expect(blueprint?.type).toBe(config.type);
    
    // Step 2 fields
    expect(blueprint?.model.modelName).toBe(config.selectedModel);
    expect(blueprint?.behavior.systemPrompt).toBe(config.systemPrompt);
    
    // Step 3 fields
    expect(blueprint?.tools.recommendedIntegrations).toEqual(config.connectors);
    
    // Step 4 fields
    expect(blueprint?.workflow.triggers).toBeDefined();
    expect(blueprint?.workflow.actions).toBeDefined();
  });

  it('should handle errors gracefully', () => {
    const invalidTemplate = null;
    
    expect(() => {
      openBuilderWithTemplate(
        invalidTemplate,
        'marketplace',
        mockNavigate
      );
    }).toThrow();
    
    // Should not have navigated
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should log conversion details', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    openBuilderWithTemplate(
      inventoryOptimizationTemplate,
      'marketplace',
      mockNavigate
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[openBuilderWithTemplate] Converting template to blueprint:',
      expect.objectContaining({
        templateId: inventoryOptimizationTemplate.id,
        templateName: inventoryOptimizationTemplate.name,
        sourceEntry: 'marketplace',
      })
    );
  });
});

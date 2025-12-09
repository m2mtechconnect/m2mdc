/**
 * YVR Template Builder Wiring Tests
 * Ensures YVR template correctly pre-fills Builder Steps 1-5
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import type { AgentBlueprint } from '@/types/agentBlueprint';

describe('YVR Template Builder Wiring', () => {
  let blueprint: AgentBlueprint;

  beforeAll(async () => {
    const template = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
    if (!template) {
      throw new Error('YVR template not found');
    }
    blueprint = templateToBlueprint(template, 'marketplace');
  });

  describe('Blueprint Conversion', () => {
    it('should convert template to blueprint', () => {
      expect(blueprint).toBeDefined();
      expect(blueprint.source).toBe('template');
      expect(blueprint.templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    });

    it('should have source entry metadata', () => {
      expect(blueprint.sourceEntry).toBe('marketplace');
    });
  });

  describe('Step 1: Summary & Configuration', () => {
    it('should have name', () => {
      expect(blueprint.name).toBeDefined();
      expect(blueprint.name).toContain('YVR');
    });

    it('should have description', () => {
      expect(blueprint.description).toBeDefined();
      expect(blueprint.description.length).toBeGreaterThan(50);
      expect(blueprint.description.toLowerCase()).toContain('airport');
    });

    it('should have industries array', () => {
      const config = blueprint as any;
      // Industries might be in different places depending on conversion
      const hasIndustry = blueprint.industry || config.industries;
      expect(hasIndustry).toBeDefined();
    });

    it('should have departments', () => {
      const config = blueprint as any;
      const hasDepartment = blueprint.department || config.departments;
      expect(hasDepartment).toBeDefined();
    });

    it('should have goals', () => {
      expect(Array.isArray(blueprint.goals)).toBe(true);
      expect(blueprint.goals.length).toBeGreaterThan(0);
    });

    it('should have ROI data', () => {
      expect(blueprint.expectedRoi).toBeDefined();
    });
  });

  describe('Step 2: Intelligence Settings', () => {
    it('should have model configuration', () => {
      expect(blueprint.model).toBeDefined();
      expect(blueprint.model.provider).toBe('google');
      expect(blueprint.model.modelName).toContain('gemini');
    });

    it('should have temperature set', () => {
      expect(typeof blueprint.model.temperature).toBe('number');
      expect(blueprint.model.temperature).toBeGreaterThan(0);
      expect(blueprint.model.temperature).toBeLessThanOrEqual(1);
    });

    it('should have knowledge configuration', () => {
      expect(blueprint.knowledge).toBeDefined();
      expect(blueprint.knowledge.summary).toBeDefined();
    });

    it('should have behavior settings', () => {
      expect(blueprint.behavior).toBeDefined();
      expect(blueprint.behavior.systemPrompt).toBeDefined();
      expect(blueprint.behavior.systemPrompt).toContain('YVR');
      expect(blueprint.behavior.systemPrompt.length).toBeGreaterThan(100);
    });

    it('should have safety settings', () => {
      expect(blueprint.behavior.safety).toBeDefined();
      expect(blueprint.behavior.safety?.hallucinationPrevention).toBe(true);
      expect(blueprint.behavior.safety?.requireCitations).toBe(true);
    });
  });

  describe('Step 3: Tools & Integrations', () => {
    it('should have tools configuration', () => {
      expect(blueprint.tools).toBeDefined();
    });

    it('should have recommended integrations', () => {
      expect(Array.isArray(blueprint.tools.recommendedIntegrations)).toBe(true);
      expect(blueprint.tools.recommendedIntegrations.length).toBeGreaterThan(0);
    });

    it('should have aviation-relevant integrations', () => {
      const integrations = blueprint.tools.recommendedIntegrations.join(' ').toLowerCase();
      const hasRelevantIntegrations = 
        integrations.includes('weather') ||
        integrations.includes('flight') ||
        integrations.includes('baggage') ||
        integrations.includes('slack') ||
        integrations.includes('notification');
      
      expect(hasRelevantIntegrations).toBe(true);
    });
  });

  describe('Step 4: Workflow', () => {
    it('should have workflow configuration', () => {
      expect(blueprint.workflow).toBeDefined();
      expect(blueprint.workflow.templateType).toBeDefined();
    });

    it('should have triggers', () => {
      expect(Array.isArray(blueprint.workflow.triggers)).toBe(true);
      expect(blueprint.workflow.triggers.length).toBeGreaterThan(0);
    });

    it('should have actions', () => {
      expect(Array.isArray(blueprint.workflow.actions)).toBe(true);
      expect(blueprint.workflow.actions.length).toBeGreaterThan(0);
    });

    it('should NOT have empty actions (regression check)', () => {
      // This was the bug we fixed - ensure actions are never empty
      const hasValidActions = blueprint.workflow.actions.length > 0;
      expect(hasValidActions).toBe(true);
      
      // Each action should have required fields
      blueprint.workflow.actions.forEach((action: any) => {
        expect(action.name || action.type).toBeDefined();
      });
    });

    it('should have integrations in workflow', () => {
      expect(Array.isArray(blueprint.workflow.integrations)).toBe(true);
    });

    it('should have valid workflow structure', () => {
      // At minimum, workflow should have triggers and actions
      const isValid = 
        blueprint.workflow.triggers.length > 0 &&
        blueprint.workflow.actions.length > 0;
      
      expect(isValid).toBe(true);
    });
  });

  describe('Step 5: Metadata', () => {
    it('should have tags', () => {
      expect(Array.isArray(blueprint.tags)).toBe(true);
    });

    it('should have certified flag', () => {
      expect(blueprint.certified).toBe(true);
    });

    it('should have rating', () => {
      expect(typeof blueprint.rating).toBe('number');
      expect(blueprint.rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should have downloads', () => {
      expect(typeof blueprint.downloads).toBe('number');
      expect(blueprint.downloads).toBeGreaterThan(0);
    });
  });

  describe('Workflow Auto-Repair', () => {
    it('should have repaired workflow with valid actions', () => {
      // The auto-repair should ensure actions are never empty
      expect(blueprint.workflow.actions).toBeDefined();
      expect(blueprint.workflow.actions.length).toBeGreaterThan(0);
    });

    it('should have action objects with required fields', () => {
      blueprint.workflow.actions.forEach((action: any) => {
        const hasRequiredFields = 
          (action.name && typeof action.name === 'string') ||
          (action.type && typeof action.type === 'string');
        
        expect(hasRequiredFields).toBe(true);
      });
    });
  });

  describe('Data Completeness', () => {
    it('should have no null critical fields', () => {
      expect(blueprint.name).not.toBeNull();
      expect(blueprint.description).not.toBeNull();
      expect(blueprint.model).not.toBeNull();
      expect(blueprint.knowledge).not.toBeNull();
      expect(blueprint.behavior).not.toBeNull();
      expect(blueprint.tools).not.toBeNull();
      expect(blueprint.workflow).not.toBeNull();
    });

    it('should have populated system prompt', () => {
      expect(blueprint.behavior.systemPrompt).toBeDefined();
      expect(blueprint.behavior.systemPrompt.length).toBeGreaterThan(100);
    });

    it('should have populated knowledge summary', () => {
      expect(blueprint.knowledge.summary).toBeDefined();
    });
  });
});

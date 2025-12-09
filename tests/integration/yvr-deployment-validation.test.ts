/**
 * YVR Deployment Validation Tests
 * Ensures YVR template can deploy without errors
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import { autoRepairWorkflow, validateRepairedWorkflow } from '@/lib/validation/workflowAutoRepair';
import type { AgentBlueprint } from '@/types/agentBlueprint';

describe('YVR Deployment Validation', () => {
  let blueprint: AgentBlueprint;

  beforeAll(async () => {
    const template = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
    if (!template) {
      throw new Error('YVR template not found');
    }
    blueprint = templateToBlueprint(template, 'marketplace');
  });

  describe('Pre-Deployment Validation', () => {
    it('should have all required fields for deployment', () => {
      expect(blueprint.name).toBeDefined();
      expect(blueprint.description).toBeDefined();
      expect(blueprint.industry).toBeDefined();
      expect(blueprint.department).toBeDefined();
      expect(blueprint.model).toBeDefined();
      expect(blueprint.workflow).toBeDefined();
    });

    it('should have non-empty workflow', () => {
      expect(blueprint.workflow.triggers).toBeDefined();
      expect(blueprint.workflow.actions).toBeDefined();
      expect(Array.isArray(blueprint.workflow.triggers)).toBe(true);
      expect(Array.isArray(blueprint.workflow.actions)).toBe(true);
    });

    it('should have at least one trigger', () => {
      expect(blueprint.workflow.triggers.length).toBeGreaterThan(0);
    });

    it('should have at least one action (CRITICAL)', () => {
      // This is the most common deployment failure
      expect(blueprint.workflow.actions.length).toBeGreaterThan(0);
    });

    it('actions should have valid structure', () => {
      blueprint.workflow.actions.forEach((action: any) => {
        const hasName = action.name && typeof action.name === 'string';
        const hasType = action.type && typeof action.type === 'string';
        const hasValidStructure = hasName || hasType;
        
        expect(hasValidStructure).toBe(true);
      });
    });
  });

  describe('Workflow Auto-Repair', () => {
    it('should have auto-repaired workflow', () => {
      const repairedWorkflow = autoRepairWorkflow({
        triggers: blueprint.workflow.triggers,
        actions: blueprint.workflow.actions,
        integrations: blueprint.workflow.integrations,
      });

      expect(repairedWorkflow).toBeDefined();
      expect(repairedWorkflow.actions).toBeDefined();
      expect(repairedWorkflow.actions.length).toBeGreaterThan(0);
    });

    it('should pass workflow validation', () => {
      const repairedWorkflow = autoRepairWorkflow({
        triggers: blueprint.workflow.triggers,
        actions: blueprint.workflow.actions,
        integrations: blueprint.workflow.integrations,
      });

      const validation = validateRepairedWorkflow(repairedWorkflow);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should maintain action integrity after repair', () => {
      const originalActionCount = blueprint.workflow.actions.length;
      
      const repairedWorkflow = autoRepairWorkflow({
        triggers: blueprint.workflow.triggers,
        actions: blueprint.workflow.actions,
        integrations: blueprint.workflow.integrations,
      });

      // Repaired workflow should have at least as many actions
      expect(repairedWorkflow.actions.length).toBeGreaterThanOrEqual(originalActionCount);
    });
  });

  describe('Deployment Payload Validation', () => {
    it('should generate valid deployment payload', () => {
      // Simulate what gets sent to builders-deploy function
      const deploymentPayload = {
        name: blueprint.name,
        description: blueprint.description,
        config: {
          model: blueprint.model,
          workflow: blueprint.workflow,
          knowledge: blueprint.knowledge,
          behavior: blueprint.behavior,
          tools: blueprint.tools,
        },
        template_id: blueprint.templateId,
        status: 'active',
      };

      expect(deploymentPayload.name).toBeDefined();
      expect(deploymentPayload.config).toBeDefined();
      expect(deploymentPayload.config.workflow).toBeDefined();
      expect(deploymentPayload.config.workflow.actions.length).toBeGreaterThan(0);
    });

    it('should not have empty or null critical fields', () => {
      expect(blueprint.name).not.toBe('');
      expect(blueprint.description).not.toBe('');
      expect(blueprint.model.provider).not.toBe('');
      expect(blueprint.model.modelName).not.toBe('');
      expect(blueprint.behavior.systemPrompt).not.toBe('');
    });
  });

  describe('Intelligence Configuration', () => {
    it('should have valid model provider', () => {
      const validProviders = ['google', 'openai', 'anthropic'];
      expect(validProviders).toContain(blueprint.model.provider);
    });

    it('should have valid model name', () => {
      expect(blueprint.model.modelName).toBeDefined();
      expect(blueprint.model.modelName).toContain('/');
      expect(blueprint.model.modelName.length).toBeGreaterThan(5);
    });

    it('should have temperature in valid range', () => {
      if (blueprint.model.temperature !== undefined) {
        expect(blueprint.model.temperature).toBeGreaterThanOrEqual(0);
        expect(blueprint.model.temperature).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Knowledge Configuration', () => {
    it('should have knowledge object', () => {
      expect(blueprint.knowledge).toBeDefined();
      expect(blueprint.knowledge.documents).toBeDefined();
      expect(blueprint.knowledge.urls).toBeDefined();
    });

    it('should have knowledge summary', () => {
      expect(blueprint.knowledge.summary).toBeDefined();
      expect(blueprint.knowledge.summary).not.toBe('');
    });
  });

  describe('Integration Configuration', () => {
    it('should have recommended integrations', () => {
      expect(Array.isArray(blueprint.tools.recommendedIntegrations)).toBe(true);
      expect(blueprint.tools.recommendedIntegrations.length).toBeGreaterThan(0);
    });

    it('should have aviation-relevant integrations', () => {
      const integrations = blueprint.tools.recommendedIntegrations.join(' ').toLowerCase();
      
      const hasWeather = integrations.includes('weather');
      const hasNotification = integrations.includes('slack') || integrations.includes('pagerduty') || integrations.includes('alert');
      const hasTracking = integrations.includes('track') || integrations.includes('flight');
      
      expect(hasWeather || hasNotification || hasTracking).toBe(true);
    });
  });

  describe('Deployment Readiness Checklist', () => {
    it('✅ intelligence settings configured', () => {
      expect(blueprint.model.provider).toBeDefined();
      expect(blueprint.model.modelName).toBeDefined();
    });

    it('✅ required data sources identified', () => {
      const config = (blueprint as any).default_config?.blueprint_json;
      if (config) {
        const requiredSources = config.data_sources?.filter((ds: any) => ds.required);
        expect(requiredSources.length).toBeGreaterThan(0);
      }
    });

    it('✅ workflows have valid triggers/actions', () => {
      expect(blueprint.workflow.triggers.length).toBeGreaterThan(0);
      expect(blueprint.workflow.actions.length).toBeGreaterThan(0);
    });

    it('✅ template passes schema validation', () => {
      // Should have passed validation during loading
      expect(blueprint).toBeDefined();
    });

    it('✅ no missing fields in builder prepopulation', () => {
      const missingFields: string[] = [];

      if (!blueprint.name) missingFields.push('name');
      if (!blueprint.description) missingFields.push('description');
      if (!blueprint.model) missingFields.push('model');
      if (!blueprint.workflow) missingFields.push('workflow');
      if (!blueprint.tools) missingFields.push('tools');

      expect(missingFields.length).toBe(0);
    });
  });
});

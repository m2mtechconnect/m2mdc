/**
 * YVR Preview Tabs Content Tests
 * Ensures all preview tabs render correctly with complete content
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import type { ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';

describe('YVR Preview Tabs Content', () => {
  let yvrTemplate: ValidatedTemplate | null = null;
  let previewSections: any;
  let defaultConfig: any;

  beforeAll(async () => {
    yvrTemplate = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
    if (!yvrTemplate) {
      throw new Error('YVR template not found');
    }
    defaultConfig = yvrTemplate.default_config as any;
    previewSections = defaultConfig?.preview_sections || {};
  });

  describe('Overview Tab Content', () => {
    it('should have overview section', () => {
      expect(previewSections.overview).toBeDefined();
    });

    it('should have hero content', () => {
      expect(previewSections.overview.tagline).toBeDefined();
      expect(previewSections.overview.description).toBeDefined();
    });

    it('should have problem statement', () => {
      expect(defaultConfig.problem_statement).toBeDefined();
      expect(defaultConfig.problem_statement.length).toBeGreaterThan(50);
    });

    it('should have target users', () => {
      expect(Array.isArray(defaultConfig.target_users)).toBe(true);
      expect(defaultConfig.target_users.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Blueprint Tab Content', () => {
    let blueprintJson: any;

    beforeAll(() => {
      blueprintJson = defaultConfig?.blueprint_json;
    });

    it('should have blueprint_json', () => {
      expect(blueprintJson).toBeDefined();
    });

    it('should have agents array with complete role definitions', () => {
      expect(Array.isArray(blueprintJson.agents)).toBe(true);
      expect(blueprintJson.agents.length).toBeGreaterThanOrEqual(3);

      blueprintJson.agents.forEach((agent: any) => {
        expect(agent.role).toBeDefined();
        expect(Array.isArray(agent.responsibilities)).toBe(true);
        expect(agent.responsibilities.length).toBeGreaterThan(0);
        expect(Array.isArray(agent.data_access)).toBe(true);
      });
    });

    it('should have data sources with complete metadata', () => {
      expect(Array.isArray(blueprintJson.data_sources)).toBe(true);
      expect(blueprintJson.data_sources.length).toBeGreaterThanOrEqual(4);

      blueprintJson.data_sources.forEach((source: any) => {
        expect(source.name).toBeDefined();
        expect(source.type).toBeDefined();
        expect(source.provider).toBeDefined();
        expect(typeof source.required).toBe('boolean');
      });
    });

    it('should have integrations', () => {
      expect(Array.isArray(blueprintJson.integrations)).toBe(true);
      expect(blueprintJson.integrations.length).toBeGreaterThanOrEqual(2);

      blueprintJson.integrations.forEach((integration: any) => {
        expect(integration.name).toBeDefined();
        expect(integration.type).toBeDefined();
        expect(integration.purpose).toBeDefined();
      });
    });

    it('should have workflow steps', () => {
      expect(Array.isArray(blueprintJson.workflow_steps)).toBe(true);
      expect(blueprintJson.workflow_steps.length).toBeGreaterThanOrEqual(4);
    });

    it('should have human approval points', () => {
      expect(Array.isArray(blueprintJson.human_approval_points)).toBe(true);
      expect(blueprintJson.human_approval_points.length).toBeGreaterThan(0);
    });
  });

  describe('Preview Tab Content', () => {
    it('should have preview_capabilities section', () => {
      expect(previewSections.preview_capabilities).toBeDefined();
    });

    it('should have capabilities headline', () => {
      expect(previewSections.preview_capabilities.headline).toBeDefined();
      expect(previewSections.preview_capabilities.headline.length).toBeGreaterThan(10);
    });

    it('should have at least 6 capability bullets', () => {
      expect(Array.isArray(previewSections.preview_capabilities.bullets)).toBe(true);
      expect(previewSections.preview_capabilities.bullets.length).toBeGreaterThanOrEqual(6);
    });

    it('should have aviation-specific capabilities', () => {
      const bullets = previewSections.preview_capabilities.bullets.join(' ').toLowerCase();
      
      const hasFlightCapability = bullets.includes('flight') || bullets.includes('delay');
      const hasBaggageCapability = bullets.includes('baggage') || bullets.includes('handling');
      const hasPassengerCapability = bullets.includes('passenger') || bullets.includes('queue');
      
      expect(hasFlightCapability).toBe(true);
      expect(hasBaggageCapability).toBe(true);
      expect(hasPassengerCapability).toBe(true);
    });
  });

  describe('Day in the Life Tab Content', () => {
    let dayInLife: any;

    beforeAll(() => {
      dayInLife = previewSections.day_in_the_life;
    });

    it('should have day_in_the_life section', () => {
      expect(dayInLife).toBeDefined();
    });

    it('should have headline', () => {
      expect(dayInLife.headline).toBeDefined();
    });

    it('should have at least 3 roles', () => {
      expect(Array.isArray(dayInLife.roles)).toBe(true);
      expect(dayInLife.roles.length).toBeGreaterThanOrEqual(3);
    });

    it('should have complete role narratives', () => {
      dayInLife.roles.forEach((role: any) => {
        expect(role.role).toBeDefined();
        expect(role.narrative).toBeDefined();
        expect(role.narrative.length).toBeGreaterThan(50);
      });
    });

    it('should have operations-specific roles', () => {
      const roleNames = dayInLife.roles.map((r: any) => r.role.toLowerCase()).join(' ');
      
      const hasOpsRole = roleNames.includes('operations') || roleNames.includes('manager');
      const hasBaggageRole = roleNames.includes('baggage') || roleNames.includes('handler');
      const hasPassengerRole = roleNames.includes('passenger') || roleNames.includes('security');
      
      expect(hasOpsRole || hasBaggageRole || hasPassengerRole).toBe(true);
    });
  });

  describe('Scenarios Tab Content', () => {
    let scenarios: any[];

    beforeAll(() => {
      scenarios = previewSections.scenarios || [];
    });

    it('should have scenarios array', () => {
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThanOrEqual(3);
    });

    it('should have complete scenario structures', () => {
      scenarios.forEach((scenario: any) => {
        expect(scenario.title).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.trigger).toBeDefined();
        expect(Array.isArray(scenario.ai_actions)).toBe(true);
        expect(scenario.ai_actions.length).toBeGreaterThan(0);
        expect(scenario.outcome).toBeDefined();
      });
    });

    it('should have weather scenario', () => {
      const weatherScenario = scenarios.find(s => 
        s.title.toLowerCase().includes('weather') || 
        s.title.toLowerCase().includes('fog')
      );
      expect(weatherScenario).toBeDefined();
    });

    it('should have baggage scenario', () => {
      const baggageScenario = scenarios.find(s =>
        s.title.toLowerCase().includes('baggage')
      );
      expect(baggageScenario).toBeDefined();
    });

    it('should have peak traffic scenario', () => {
      const peakScenario = scenarios.find(s =>
        s.title.toLowerCase().includes('peak') ||
        s.title.toLowerCase().includes('holiday') ||
        s.title.toLowerCase().includes('traffic')
      );
      expect(peakScenario).toBeDefined();
    });

    it('scenarios should have actionable AI steps', () => {
      scenarios.forEach((scenario: any) => {
        const hasActionableSteps = scenario.ai_actions.some((action: string) =>
          action.toLowerCase().includes('predict') ||
          action.toLowerCase().includes('recommend') ||
          action.toLowerCase().includes('alert') ||
          action.toLowerCase().includes('optimize')
        );
        expect(hasActionableSteps).toBe(true);
      });
    });

    it('scenarios should have measurable outcomes', () => {
      scenarios.forEach((scenario: any) => {
        expect(scenario.outcome).toBeDefined();
        expect(scenario.outcome.length).toBeGreaterThan(20);
      });
    });
  });

  describe('Deploy Tab Content', () => {
    let cloudMetadata: any;

    beforeAll(() => {
      cloudMetadata = defaultConfig?.cloud_metadata;
    });

    it('should have cloud_metadata', () => {
      expect(cloudMetadata).toBeDefined();
    });

    it('should have complete AWS deployment info', () => {
      expect(cloudMetadata.aws).toBeDefined();
      expect(cloudMetadata.aws.tagline).toBeDefined();
      expect(cloudMetadata.aws.recommended_architecture).toBeDefined();
      expect(Array.isArray(cloudMetadata.aws.recommended_services)).toBe(true);
      expect(cloudMetadata.aws.recommended_services.length).toBeGreaterThanOrEqual(5);
      expect(cloudMetadata.aws.estimated_monthly_cost).toBeDefined();
      expect(Array.isArray(cloudMetadata.aws.learn_more)).toBe(true);
    });

    it('should have complete Azure deployment info', () => {
      expect(cloudMetadata.azure).toBeDefined();
      expect(cloudMetadata.azure.tagline).toBeDefined();
      expect(cloudMetadata.azure.recommended_architecture).toBeDefined();
      expect(Array.isArray(cloudMetadata.azure.recommended_services)).toBe(true);
      expect(cloudMetadata.azure.estimated_monthly_cost).toBeDefined();
    });

    it('should have complete GCP deployment info', () => {
      expect(cloudMetadata.gcp).toBeDefined();
      expect(cloudMetadata.gcp.tagline).toBeDefined();
      expect(cloudMetadata.gcp.recommended_architecture).toBeDefined();
      expect(Array.isArray(cloudMetadata.gcp.recommended_services)).toBe(true);
      expect(cloudMetadata.gcp.estimated_monthly_cost).toBeDefined();
    });

    it('should have deployment patterns for each cloud', () => {
      ['aws', 'azure', 'gcp'].forEach(cloud => {
        expect(cloudMetadata[cloud].deployment_pattern).toBeDefined();
        expect(typeof cloudMetadata[cloud].deployment_pattern).toBe('object');
      });
    });
  });

  describe('Simulation Tab Content', () => {
    it('should have simulation scripts or scenarios', () => {
      const hasSimulationScripts = Array.isArray(defaultConfig.simulation_scripts);
      const hasScenarios = Array.isArray(previewSections.scenarios) && previewSections.scenarios.length > 0;
      
      expect(hasSimulationScripts || hasScenarios).toBe(true);
    });
  });

  describe('Content Completeness', () => {
    it('should have no placeholder text', () => {
      const configString = JSON.stringify(defaultConfig).toLowerCase();
      
      expect(configString).not.toContain('lorem ipsum');
      expect(configString).not.toContain('placeholder');
      expect(configString).not.toContain('todo');
      expect(configString).not.toContain('xxx');
    });

    it('should have realistic data', () => {
      // ROI should be realistic (20-100%)
      expect(yvrTemplate?.roi_pct).toBeGreaterThan(20);
      expect(yvrTemplate?.roi_pct).toBeLessThanOrEqual(100);

      // Rating should be realistic (3-5)
      expect(yvrTemplate?.rating).toBeGreaterThanOrEqual(3);
      expect(yvrTemplate?.rating).toBeLessThanOrEqual(5);

      // Downloads should be positive
      expect(yvrTemplate?.downloads).toBeGreaterThan(0);
    });

    it('should have aviation-specific terminology', () => {
      const contentString = JSON.stringify(defaultConfig).toLowerCase();
      
      const aviationTerms = ['flight', 'baggage', 'passenger', 'airport', 'gate', 'security'];
      const hasAviationTerms = aviationTerms.some(term => contentString.includes(term));
      
      expect(hasAviationTerms).toBe(true);
    });
  });
});

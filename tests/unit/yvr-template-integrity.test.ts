/**
 * YVR Template Integrity Tests
 * Ensures YVR_AIRPORT_DIGITAL_TWIN template exists and is structurally complete
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplateById, validateTemplate } from '@/lib/templates/unifiedTemplateService';
import type { ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';

describe('YVR Template Backend Integrity', () => {
  let yvrTemplate: ValidatedTemplate | null = null;

  beforeAll(async () => {
    yvrTemplate = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
  });

  describe('Template Existence', () => {
    it('should exist in agent_templates table', () => {
      expect(yvrTemplate).toBeDefined();
      expect(yvrTemplate).not.toBeNull();
    });

    it('should have correct id and slug', () => {
      expect(yvrTemplate?.id).toBe('YVR_AIRPORT_DIGITAL_TWIN');
      expect(yvrTemplate?.slug).toBe('yvr-airport-digital-twin');
    });

    it('should have correct name', () => {
      expect(yvrTemplate?.name).toBe('YVR Airport Operations Digital Twin');
    });

    it('should be in Aviation & Transportation category', () => {
      expect(yvrTemplate?.category).toBe('Aviation & Transportation');
    });
  });

  describe('Core Metadata', () => {
    it('should be certified', () => {
      expect(yvrTemplate?.certified).toBe(true);
    });

    it('should have high rating', () => {
      expect(yvrTemplate?.rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should have substantial downloads', () => {
      expect(yvrTemplate?.downloads).toBeGreaterThan(1000);
    });

    it('should have positive ROI', () => {
      expect(yvrTemplate?.roi_pct).toBeGreaterThan(30);
    });

    it('should have relevant tags', () => {
      expect(yvrTemplate?.tags).toBeInstanceOf(Array);
      expect(yvrTemplate?.tags).toContain('Airport Operations');
    });
  });

  describe('Default Configuration', () => {
    it('should have complete default_config object', () => {
      expect(yvrTemplate?.default_config).toBeDefined();
      expect(typeof yvrTemplate?.default_config).toBe('object');
    });

    it('should have industry and department arrays', () => {
      const config = yvrTemplate?.default_config as any;
      expect(Array.isArray(config?.industries)).toBe(true);
      expect(config?.industries).toContain('Aviation');
      expect(Array.isArray(config?.departments)).toBe(true);
      expect(config?.departments).toContain('Operations');
    });

    it('should have AI model configuration', () => {
      const config = yvrTemplate?.default_config as any;
      expect(config?.provider).toBe('google');
      expect(config?.model).toContain('gemini');
      expect(typeof config?.temperature).toBe('number');
    });

    it('should have system prompt', () => {
      const config = yvrTemplate?.default_config as any;
      expect(config?.system_prompt).toBeDefined();
      expect(config?.system_prompt).toContain('YVR');
      expect(config?.system_prompt.length).toBeGreaterThan(100);
    });

    it('should have RAG configuration', () => {
      const config = yvrTemplate?.default_config as any;
      expect(config?.rag).toBeDefined();
      expect(config?.rag?.provider).toBe('vertex_ai');
      expect(config?.rag?.hybrid_search).toBe(true);
    });
  });

  describe('Preview Sections', () => {
    let previewSections: any;

    beforeAll(() => {
      previewSections = (yvrTemplate?.default_config as any)?.preview_sections;
    });

    it('should have preview_sections object', () => {
      expect(previewSections).toBeDefined();
      expect(typeof previewSections).toBe('object');
    });

    it('should have overview section', () => {
      expect(previewSections?.overview).toBeDefined();
      expect(previewSections?.overview?.tagline).toBeDefined();
      expect(previewSections?.overview?.description).toBeDefined();
    });

    it('should have preview_capabilities section', () => {
      expect(previewSections?.preview_capabilities).toBeDefined();
      expect(previewSections?.preview_capabilities?.headline).toBeDefined();
      expect(Array.isArray(previewSections?.preview_capabilities?.bullets)).toBe(true);
      expect(previewSections?.preview_capabilities?.bullets.length).toBeGreaterThanOrEqual(6);
    });

    it('should have day_in_the_life section with roles', () => {
      expect(previewSections?.day_in_the_life).toBeDefined();
      expect(Array.isArray(previewSections?.day_in_the_life?.roles)).toBe(true);
      expect(previewSections?.day_in_the_life?.roles.length).toBeGreaterThanOrEqual(3);
      
      const firstRole = previewSections?.day_in_the_life?.roles[0];
      expect(firstRole?.role).toBeDefined();
      expect(firstRole?.narrative).toBeDefined();
    });

    it('should have scenarios section', () => {
      expect(Array.isArray(previewSections?.scenarios)).toBe(true);
      expect(previewSections?.scenarios.length).toBeGreaterThanOrEqual(3);
      
      const firstScenario = previewSections?.scenarios[0];
      expect(firstScenario?.title).toBeDefined();
      expect(firstScenario?.description).toBeDefined();
      expect(Array.isArray(firstScenario?.ai_actions)).toBe(true);
      expect(firstScenario?.outcome).toBeDefined();
    });
  });

  describe('KPI Block', () => {
    let kpiBlock: any;

    beforeAll(() => {
      kpiBlock = (yvrTemplate?.default_config as any)?.kpi_block;
    });

    it('should have kpi_block object', () => {
      expect(kpiBlock).toBeDefined();
      expect(typeof kpiBlock).toBe('object');
    });

    it('should have headline', () => {
      expect(kpiBlock?.headline).toBeDefined();
      expect(typeof kpiBlock?.headline).toBe('string');
    });

    it('should have at least 4 KPIs', () => {
      expect(Array.isArray(kpiBlock?.kpis)).toBe(true);
      expect(kpiBlock?.kpis.length).toBeGreaterThanOrEqual(4);
    });

    it('should have well-formed KPI objects', () => {
      const firstKpi = kpiBlock?.kpis[0];
      expect(firstKpi?.label).toBeDefined();
      expect(firstKpi?.key).toBeDefined();
      expect(firstKpi?.unit).toBeDefined();
      expect(firstKpi?.direction).toMatch(/higher|lower/);
      expect(typeof firstKpi?.baseline).toBe('number');
      expect(typeof firstKpi?.target_value).toBe('number');
    });
  });

  describe('ROI Block', () => {
    let roiBlock: any;

    beforeAll(() => {
      roiBlock = (yvrTemplate?.default_config as any)?.roi_block;
    });

    it('should have roi_block object', () => {
      expect(roiBlock).toBeDefined();
      expect(typeof roiBlock).toBe('object');
    });

    it('should have headline', () => {
      expect(roiBlock?.headline).toBeDefined();
      expect(roiBlock?.headline).toContain('ROI');
    });

    it('should have benefits array', () => {
      expect(Array.isArray(roiBlock?.benefits)).toBe(true);
      expect(roiBlock?.benefits.length).toBeGreaterThanOrEqual(4);
    });

    it('should have example impact estimates', () => {
      expect(Array.isArray(roiBlock?.example_impact_estimates)).toBe(true);
      expect(roiBlock?.example_impact_estimates.length).toBeGreaterThanOrEqual(2);
      
      const firstEstimate = roiBlock?.example_impact_estimates[0];
      expect(firstEstimate?.label).toBeDefined();
      expect(firstEstimate?.metric).toBeDefined();
      expect(firstEstimate?.baseline).toBeDefined();
      expect(firstEstimate?.estimated_range).toBeDefined();
      expect(typeof firstEstimate?.estimated_annual_roi_pct).toBe('number');
    });

    it('should have total estimated annual ROI', () => {
      expect(typeof roiBlock?.total_estimated_annual_roi_pct).toBe('number');
      expect(roiBlock?.total_estimated_annual_roi_pct).toBeGreaterThan(30);
    });
  });

  describe('Workflows', () => {
    let workflows: any[];

    beforeAll(() => {
      workflows = (yvrTemplate?.default_config as any)?.workflows || [];
    });

    it('should have workflows array', () => {
      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThanOrEqual(3);
    });

    it('should have delay prediction workflow', () => {
      const delayWorkflow = workflows.find(w => w.id === 'delay_prediction');
      expect(delayWorkflow).toBeDefined();
      expect(delayWorkflow?.name).toContain('Delay');
      expect(delayWorkflow?.trigger).toBeDefined();
      expect(Array.isArray(delayWorkflow?.actions)).toBe(true);
      expect(delayWorkflow?.actions.length).toBeGreaterThan(0);
    });

    it('should have baggage optimization workflow', () => {
      const baggageWorkflow = workflows.find(w => w.id === 'baggage_optimization');
      expect(baggageWorkflow).toBeDefined();
      expect(baggageWorkflow?.name).toContain('Baggage');
    });

    it('should have passenger flow workflow', () => {
      const flowWorkflow = workflows.find(w => w.id === 'passenger_flow_management');
      expect(flowWorkflow).toBeDefined();
      expect(flowWorkflow?.name).toContain('Passenger');
    });

    it('should have valid workflow structure', () => {
      workflows.forEach(workflow => {
        expect(workflow.id).toBeDefined();
        expect(workflow.name).toBeDefined();
        expect(workflow.trigger).toBeDefined();
        expect(workflow.trigger.type).toBeDefined();
        expect(Array.isArray(workflow.actions)).toBe(true);
        expect(workflow.actions.length).toBeGreaterThan(0);
        expect(Array.isArray(workflow.outputs)).toBe(true);
      });
    });
  });

  describe('Blueprint JSON', () => {
    let blueprintJson: any;

    beforeAll(() => {
      blueprintJson = (yvrTemplate?.default_config as any)?.blueprint_json;
    });

    it('should have blueprint_json object', () => {
      expect(blueprintJson).toBeDefined();
      expect(typeof blueprintJson).toBe('object');
    });

    it('should have agents array', () => {
      expect(Array.isArray(blueprintJson?.agents)).toBe(true);
      expect(blueprintJson?.agents.length).toBeGreaterThanOrEqual(3);
      
      const firstAgent = blueprintJson?.agents[0];
      expect(firstAgent?.role).toBeDefined();
      expect(Array.isArray(firstAgent?.responsibilities)).toBe(true);
      expect(Array.isArray(firstAgent?.data_access)).toBe(true);
    });

    it('should have data_sources array', () => {
      expect(Array.isArray(blueprintJson?.data_sources)).toBe(true);
      expect(blueprintJson?.data_sources.length).toBeGreaterThanOrEqual(4);
      
      const firstSource = blueprintJson?.data_sources[0];
      expect(firstSource?.name).toBeDefined();
      expect(firstSource?.type).toBeDefined();
      expect(firstSource?.provider).toBeDefined();
      expect(typeof firstSource?.required).toBe('boolean');
    });

    it('should have integrations array', () => {
      expect(Array.isArray(blueprintJson?.integrations)).toBe(true);
      expect(blueprintJson?.integrations.length).toBeGreaterThanOrEqual(2);
      
      const firstIntegration = blueprintJson?.integrations[0];
      expect(firstIntegration?.name).toBeDefined();
      expect(firstIntegration?.type).toBeDefined();
      expect(firstIntegration?.purpose).toBeDefined();
    });

    it('should have workflow_steps array', () => {
      expect(Array.isArray(blueprintJson?.workflow_steps)).toBe(true);
      expect(blueprintJson?.workflow_steps.length).toBeGreaterThanOrEqual(4);
    });

    it('should have human_approval_points', () => {
      expect(Array.isArray(blueprintJson?.human_approval_points)).toBe(true);
      expect(blueprintJson?.human_approval_points.length).toBeGreaterThan(0);
    });

    it('should have kpis', () => {
      expect(Array.isArray(blueprintJson?.kpis)).toBe(true);
      expect(blueprintJson?.kpis.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Cloud Metadata', () => {
    let cloudMetadata: any;

    beforeAll(() => {
      cloudMetadata = (yvrTemplate?.default_config as any)?.cloud_metadata;
    });

    it('should have cloud_metadata object', () => {
      expect(cloudMetadata).toBeDefined();
      expect(typeof cloudMetadata).toBe('object');
    });

    it('should have AWS configuration', () => {
      expect(cloudMetadata?.aws).toBeDefined();
      expect(cloudMetadata?.aws?.tagline).toBeDefined();
      expect(cloudMetadata?.aws?.recommended_architecture).toBeDefined();
      expect(Array.isArray(cloudMetadata?.aws?.recommended_services)).toBe(true);
      expect(cloudMetadata?.aws?.recommended_services.length).toBeGreaterThanOrEqual(5);
    });

    it('should have Azure configuration', () => {
      expect(cloudMetadata?.azure).toBeDefined();
      expect(cloudMetadata?.azure?.tagline).toBeDefined();
      expect(cloudMetadata?.azure?.recommended_architecture).toBeDefined();
      expect(Array.isArray(cloudMetadata?.azure?.recommended_services)).toBe(true);
    });

    it('should have GCP configuration', () => {
      expect(cloudMetadata?.gcp).toBeDefined();
      expect(cloudMetadata?.gcp?.tagline).toBeDefined();
      expect(cloudMetadata?.gcp?.recommended_architecture).toBeDefined();
      expect(Array.isArray(cloudMetadata?.gcp?.recommended_services)).toBe(true);
    });

    it('should have cost estimates for all clouds', () => {
      expect(cloudMetadata?.aws?.estimated_monthly_cost).toBeDefined();
      expect(cloudMetadata?.azure?.estimated_monthly_cost).toBeDefined();
      expect(cloudMetadata?.gcp?.estimated_monthly_cost).toBeDefined();
    });

    it('should have learn more links', () => {
      expect(Array.isArray(cloudMetadata?.aws?.learn_more)).toBe(true);
      expect(Array.isArray(cloudMetadata?.azure?.learn_more)).toBe(true);
      expect(Array.isArray(cloudMetadata?.gcp?.learn_more)).toBe(true);
    });
  });

  describe('Sample Prompts', () => {
    it('should have sample prompts array', () => {
      expect(Array.isArray(yvrTemplate?.sample_prompts)).toBe(true);
      expect(yvrTemplate?.sample_prompts.length).toBeGreaterThanOrEqual(6);
    });

    it('should have aviation-specific prompts', () => {
      const prompts = yvrTemplate?.sample_prompts || [];
      const hasFlightPrompt = prompts.some(p => p.toLowerCase().includes('flight'));
      const hasBaggagePrompt = prompts.some(p => p.toLowerCase().includes('baggage'));
      const hasSecurityPrompt = prompts.some(p => p.toLowerCase().includes('security'));
      
      expect(hasFlightPrompt).toBe(true);
      expect(hasBaggagePrompt).toBe(true);
      expect(hasSecurityPrompt).toBe(true);
    });
  });

  describe('Recommended Models', () => {
    it('should have recommended models array', () => {
      expect(Array.isArray(yvrTemplate?.recommended_models)).toBe(true);
      expect(yvrTemplate?.recommended_models.length).toBeGreaterThanOrEqual(2);
    });

    it('should include Gemini models', () => {
      const models = yvrTemplate?.recommended_models || [];
      const hasGemini = models.some(m => m.includes('gemini'));
      expect(hasGemini).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    it('should pass schema validation', () => {
      if (!yvrTemplate) {
        throw new Error('YVR template not loaded');
      }
      
      const validation = validateTemplate(yvrTemplate);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('Uniqueness', () => {
    it('should be the only template with this ID', async () => {
      const { loadAllTemplates } = await import('@/lib/templates/unifiedTemplateService');
      const allTemplates = await loadAllTemplates();
      
      const yvrTemplates = allTemplates.filter(t => t.id === 'YVR_AIRPORT_DIGITAL_TWIN');
      expect(yvrTemplates.length).toBe(1);
    });

    it('should be the only template with this slug', async () => {
      const { loadAllTemplates } = await import('@/lib/templates/unifiedTemplateService');
      const allTemplates = await loadAllTemplates();
      
      const yvrTemplates = allTemplates.filter(t => t.slug === 'yvr-airport-digital-twin');
      expect(yvrTemplates.length).toBe(1);
    });
  });
});

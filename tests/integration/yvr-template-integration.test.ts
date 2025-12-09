/**
 * Integration Test: YVR Template System Integration
 * Tests template loading, conversion, and workflow auto-repair
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import { autoRepairWorkflow, validateRepairedWorkflow } from '@/lib/validation/workflowAutoRepair';

describe('YVR Template Integration', () => {
  let yvrTemplate: any;

  beforeAll(async () => {
    // Load YVR template from database
    yvrTemplate = await loadTemplateById('YVR_AIRPORT_DIGITAL_TWIN');
  });

  it('should load YVR template from database', () => {
    expect(yvrTemplate).toBeDefined();
    expect(yvrTemplate?.id).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    expect(yvrTemplate?.name).toBe('YVR Airport Operations Digital Twin');
    expect(yvrTemplate?.slug).toBe('yvr-airport-digital-twin');
  });

  it('should have complete template structure', () => {
    expect(yvrTemplate?.default_config).toBeDefined();
    expect(yvrTemplate?.default_config?.workflows).toBeDefined();
    expect(yvrTemplate?.default_config?.preview_sections).toBeDefined();
    expect(yvrTemplate?.default_config?.kpi_block).toBeDefined();
    expect(yvrTemplate?.default_config?.roi_block).toBeDefined();
  });

  it('should have 4 workflows defined', () => {
    const workflows = yvrTemplate?.default_config?.workflows;
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows?.length).toBe(4);
    
    const workflowNames = workflows?.map((w: any) => w.name) || [];
    expect(workflowNames).toContain('Baggage SLA Watchdog');
    expect(workflowNames).toContain('Queue Congestion Resolver');
    expect(workflowNames).toContain('Irregular Operations Playbook');
    expect(workflowNames).toContain('Emissions Tracking and Reporting');
  });

  it('should have Day in the Life with 3 roles', () => {
    const dayInLife = yvrTemplate?.default_config?.preview_sections?.day_in_the_life;
    expect(dayInLife).toBeDefined();
    expect(Array.isArray(dayInLife?.roles)).toBe(true);
    expect(dayInLife?.roles?.length).toBe(3);
    
    const roles = dayInLife?.roles?.map((r: any) => r.role) || [];
    expect(roles).toContain('Duty Manager');
    expect(roles).toContain('Head of Baggage Operations');
    expect(roles).toContain('Chief Sustainability Officer');
  });

  it('should have cloud metadata for all 3 providers', () => {
    const cloudMetadata = yvrTemplate?.default_config?.cloud_metadata;
    expect(cloudMetadata).toBeDefined();
    expect(cloudMetadata?.aws?.enabled).toBe(true);
    expect(cloudMetadata?.azure?.enabled).toBe(true);
    expect(cloudMetadata?.gcp?.enabled).toBe(true);
    
    expect(cloudMetadata?.aws?.recommended_services).toBeDefined();
    expect(cloudMetadata?.azure?.recommended_services).toBeDefined();
    expect(cloudMetadata?.gcp?.recommended_services).toBeDefined();
  });

  it('should convert YVR template to blueprint', () => {
    const blueprint = templateToBlueprint(yvrTemplate, 'marketplace');
    
    expect(blueprint).toBeDefined();
    expect(blueprint.source).toBe('template');
    expect(blueprint.templateId).toBe('YVR_AIRPORT_DIGITAL_TWIN');
    expect(blueprint.name).toContain('YVR');
  });

  it('should extract workflow actions from YVR template', () => {
    const blueprint = templateToBlueprint(yvrTemplate, 'marketplace');
    
    expect(blueprint.workflow).toBeDefined();
    expect(blueprint.workflow?.actions).toBeDefined();
    expect(Array.isArray(blueprint.workflow?.actions)).toBe(true);
    expect(blueprint.workflow?.actions?.length).toBeGreaterThan(0);
  });

  it('should auto-repair workflow if actions are missing', () => {
    // Create a workflow with triggers but no actions
    const brokenWorkflow = {
      triggers: [{ type: 'event', name: 'test_trigger' }],
      actions: []
    };
    
    const repaired = autoRepairWorkflow(brokenWorkflow);
    
    expect(repaired.actions).toBeDefined();
    expect(repaired.actions?.length).toBeGreaterThan(0);
    expect(repaired.actions?.[0]?.type).toBe('log_event');
  });

  it('should validate repaired workflows', () => {
    const workflow = {
      triggers: [],
      actions: [{
        id: 'action_1',
        type: 'log_event',
        config: {}
      }]
    };
    
    const validation = validateRepairedWorkflow(workflow);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid workflows', () => {
    const invalidWorkflow = {
      triggers: [],
      actions: [{
        // Missing required 'type' field
        id: 'action_1',
        config: {}
      }]
    };
    
    const validation = validateRepairedWorkflow(invalidWorkflow);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle multiple industries and departments', () => {
    const blueprint = templateToBlueprint(yvrTemplate, 'marketplace');
    
    // YVR has multiple industries: Aviation, Transportation, Smart Infrastructure
    expect(blueprint.industry).toBeDefined();
    expect(['Aviation', 'Transportation', 'Smart Infrastructure']).toContain(blueprint.industry);
    
    // YVR has multiple departments
    expect(blueprint.department).toBeDefined();
  });

  it('should extract KPIs correctly', () => {
    const kpis = yvrTemplate?.default_config?.kpi_block;
    expect(Array.isArray(kpis)).toBe(true);
    expect(kpis?.length).toBe(4);
    
    const kpiKeys = kpis?.map((k: any) => k.key) || [];
    expect(kpiKeys).toContain('on_time_departure_rate');
    expect(kpiKeys).toContain('avg_security_wait_time');
    expect(kpiKeys).toContain('baggage_first_bag_sla');
    expect(kpiKeys).toContain('ghg_per_passenger');
  });

  it('should extract ROI information', () => {
    const roi = yvrTemplate?.default_config?.roi_block;
    expect(roi).toBeDefined();
    expect(roi?.headline).toBeDefined();
    expect(Array.isArray(roi?.benefits)).toBe(true);
    expect(roi?.benefits?.length).toBeGreaterThan(0);
    expect(Array.isArray(roi?.example_impact_estimates)).toBe(true);
  });

  it('should extract scenarios', () => {
    const scenarios = yvrTemplate?.default_config?.preview_sections?.scenarios;
    expect(scenarios).toBeDefined();
    expect(Array.isArray(scenarios?.items)).toBe(true);
    expect(scenarios?.items?.length).toBe(4);
    
    const scenarioNames = scenarios?.items?.map((s: any) => s.name) || [];
    expect(scenarioNames).toContain('Holiday Peak Traffic');
    expect(scenarioNames).toContain('Fog and Low Visibility');
  });
});

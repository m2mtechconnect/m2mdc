/**
 * Unit tests for blueprint converter functions
 * Tests the core logic that converts different inputs into AgentBlueprint
 */

import { describe, it, expect } from 'vitest';
import { questionnaireToBlueprint } from '@/lib/builder/questionnaireToBlueprint';
import { documentAnalysisToBlueprint } from '@/lib/builder/documentToBlueprint';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import { 
  customerSupportAgentAnswers, 
  inventoryOptimizationTwinAnswers,
  minimalAnswers 
} from '../fixtures/questionnaire-answers';
import { 
  smallDocumentAnalysis, 
  largeDocumentAnalysis,
  minimalDocumentAnalysis 
} from '../fixtures/document-analysis';
import { 
  inventoryOptimizationTemplate, 
  customerSupportTemplate,
  minimalTemplate 
} from '../fixtures/templates';

describe('questionnaireToBlueprint', () => {
  it('should convert customer support agent answers to blueprint', () => {
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);

    expect(blueprint.source).toBe('questionnaire');
    expect(blueprint.type).toBe('agent');
    expect(blueprint.industry).toBe('Technology');
    expect(blueprint.department).toBe('Customer Support');
    expect(blueprint.name).toContain('Customer Success Assistant');
    expect(blueprint.goals).toContain('Automate customer support responses');
    
    // Model configuration
    expect(blueprint.model.provider).toBe('gemini');
    expect(blueprint.model.modelName).toBe('google/gemini-2.5-flash');
    expect(blueprint.model.temperature).toBe(0.7); // Agents are more creative
    
    // Tools
    expect(blueprint.tools.recommendedIntegrations).toEqual(['Slack', 'Salesforce', 'HubSpot']);
    expect(blueprint.tools.preselectedIntegrations).toHaveLength(3);
    
    // Workflow
    expect(blueprint.workflow.triggers).toHaveLength(2);
    expect(blueprint.workflow.actions).toHaveLength(2);
    
    // Safety
    expect(blueprint.behavior.safety?.hallucinationPrevention).toBe(true);
    expect(blueprint.behavior.safety?.requireCitations).toBe(true); // Due to compliance
  });

  it('should convert inventory twin answers to blueprint', () => {
    const blueprint = questionnaireToBlueprint(inventoryOptimizationTwinAnswers);

    expect(blueprint.source).toBe('questionnaire');
    expect(blueprint.type).toBe('process_twin');
    expect(blueprint.industry).toBe('Retail');
    expect(blueprint.department).toBe('Operations');
    expect(blueprint.level).toBe('Strategic'); // High risk + large team
    
    // Model configuration - lower temperature for twin
    expect(blueprint.model.temperature).toBe(0.3);
    
    // Communication style - formal for high risk
    expect(blueprint.behavior.communicationStyle?.formal).toBe(true);
    expect(blueprint.behavior.communicationStyle?.emojis).toBe(false);
    
    // Workflow should be process-oriented
    const triggerNames = blueprint.workflow.triggers.map(t => t.name);
    expect(triggerNames).toContain('Process Start');
  });

  it('should handle minimal answers', () => {
    const blueprint = questionnaireToBlueprint(minimalAnswers);

    expect(blueprint.source).toBe('questionnaire');
    expect(blueprint.type).toBe('agent');
    expect(blueprint.level).toBe('Operational'); // Low risk + small team
    expect(blueprint.tools.recommendedIntegrations).toEqual([]);
    expect(blueprint.behavior.safety?.requireCitations).toBe(false); // No compliance needs
  });

  it('should generate appropriate system prompts', () => {
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    expect(blueprint.behavior.systemPrompt).toContain('Customer Success Assistant');
    expect(blueprint.behavior.systemPrompt).toContain('Technology');
    expect(blueprint.behavior.systemPrompt).toContain('customer support responses');
    expect(blueprint.behavior.systemPrompt).toContain('GDPR'); // Compliance mentioned
  });

  it('should extract ROI from success metrics', () => {
    const blueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    
    expect(blueprint.expectedRoi).toBe('50% improvement'); // Extracted from "Reduce response time by 50%"
  });

  it('should estimate time saved based on team size', () => {
    const smallTeam = questionnaireToBlueprint(minimalAnswers);
    expect(smallTeam.timeSavedPerWeek).toBe('5-10 hours/week');
    
    const mediumTeam = questionnaireToBlueprint(customerSupportAgentAnswers);
    expect(mediumTeam.timeSavedPerWeek).toBe('10-20 hours/week');
    
    const largeTeam = questionnaireToBlueprint(inventoryOptimizationTwinAnswers);
    expect(largeTeam.timeSavedPerWeek).toBe('20-40 hours/week');
  });
});

describe('documentAnalysisToBlueprint', () => {
  it('should convert small document analysis to blueprint', () => {
    const blueprint = documentAnalysisToBlueprint(smallDocumentAnalysis, 'patient-intake.pdf');

    expect(blueprint.source).toBe('file');
    expect(blueprint.type).toBe('process_twin'); // Recommended type
    expect(blueprint.industry).toBe('Healthcare');
    expect(blueprint.department).toBe('Operations');
    expect(blueprint.level).toBe('Tactical'); // Medium complexity
    
    // Knowledge should include the file
    expect(blueprint.knowledge.documents).toContain('patient-intake.pdf');
    expect(blueprint.knowledge.summary).toContain('Healthcare');
    
    // Goals from KPIs
    expect(blueprint.goals).toHaveLength(2);
    expect(blueprint.goals[0]).toContain('Wait Time Reduction');
    
    // Integrations from analysis
    expect(blueprint.tools.recommendedIntegrations).toContain('Electronic Health Record System');
  });

  it('should convert large document analysis to blueprint', () => {
    const blueprint = documentAnalysisToBlueprint(largeDocumentAnalysis, 'supply-chain-analysis.pdf');

    expect(blueprint.source).toBe('file');
    expect(blueprint.level).toBe('Strategic'); // High complexity
    expect(blueprint.goals).toHaveLength(3);
    
    // Workflow should have multiple triggers and actions
    expect(blueprint.workflow.triggers).toHaveLength(2);
    expect(blueprint.workflow.actions.length).toBeGreaterThan(4);
  });

  it('should handle minimal document analysis', () => {
    const blueprint = documentAnalysisToBlueprint(minimalDocumentAnalysis, 'it-helpdesk.txt');

    expect(blueprint.source).toBe('file');
    expect(blueprint.type).toBe('agent'); // Not a twin
    expect(blueprint.level).toBe('Operational'); // Low complexity
    expect(blueprint.goals).toHaveLength(1);
  });

  it('should extract time saved from KPIs', () => {
    const blueprint = documentAnalysisToBlueprint(smallDocumentAnalysis);
    
    // Should find time-related KPI
    expect(blueprint.timeSavedPerWeek).toBeDefined();
  });

  it('should extract efficiency gain from KPIs', () => {
    const blueprint = documentAnalysisToBlueprint(largeDocumentAnalysis);
    
    expect(blueprint.efficiencyGain).toBeDefined();
    expect(blueprint.efficiencyGain).toContain('%');
  });

  it('should use builder prefill for system prompt', () => {
    const blueprint = documentAnalysisToBlueprint(smallDocumentAnalysis);
    
    expect(blueprint.behavior.systemPrompt).toContain('healthcare intake assistant');
    expect(blueprint.behavior.systemPrompt).toContain('HIPAA');
  });

  it('should handle compliance requirements', () => {
    const blueprint = documentAnalysisToBlueprint(smallDocumentAnalysis);
    
    expect(blueprint.behavior.safety?.requireCitations).toBe(true); // Has compliance needs
    expect(blueprint.tags).toContain('HIPAA');
  });
});

describe('templateToBlueprint', () => {
  it('should convert inventory optimization template to blueprint', () => {
    const blueprint = templateToBlueprint(inventoryOptimizationTemplate, 'marketplace');

    expect(blueprint.source).toBe('template');
    expect(blueprint.sourceEntry).toBe('marketplace');
    expect(blueprint.templateId).toBe('multi-location-inventory-twin');
    expect(blueprint.templateName).toBe('Multi-Location Inventory Optimization Twin');
    expect(blueprint.certified).toBe(true);
    expect(blueprint.rating).toBe(4.8);
    expect(blueprint.downloads).toBe(342);
    
    // Metadata
    expect(blueprint.industry).toBe('Retail');
    expect(blueprint.type).toBe('process_twin');
    expect(blueprint.expectedRoi).toBe('45%');
    
    // Goals from template
    expect(blueprint.goals).toHaveLength(3);
    expect(blueprint.goals[0]).toContain('Reduce stockouts');
    
    // Tools
    expect(blueprint.tools.recommendedIntegrations).toContain('POS System');
    expect(blueprint.tools.preselectedIntegrations).toContain('Warehouse Management');
    
    // Workflow
    expect(blueprint.workflow.triggers).toHaveLength(2);
    expect(blueprint.workflow.actions).toHaveLength(3);
  });

  it('should convert customer support template to blueprint', () => {
    const blueprint = templateToBlueprint(customerSupportTemplate, 'dashboard');

    expect(blueprint.source).toBe('template');
    expect(blueprint.sourceEntry).toBe('dashboard');
    expect(blueprint.type).toBe('agent');
    expect(blueprint.certified).toBe(false);
    
    // Communication style
    expect(blueprint.behavior.communicationStyle?.formal).toBe(false);
    expect(blueprint.behavior.communicationStyle?.emojis).toBe(true);
  });

  it('should handle minimal template', () => {
    const blueprint = templateToBlueprint(minimalTemplate, 'builder');

    expect(blueprint.source).toBe('template');
    expect(blueprint.sourceEntry).toBe('builder');
    expect(blueprint.type).toBe('agent');
    expect(blueprint.tools.recommendedIntegrations).toEqual([]);
    expect(blueprint.workflow.triggers).toEqual([]);
  });

  it('should default to marketplace sourceEntry when not provided', () => {
    const blueprint = templateToBlueprint(minimalTemplate);

    expect(blueprint.sourceEntry).toBe('marketplace');
  });

  it('should detect model provider from model name', () => {
    const geminiBlueprint = templateToBlueprint(inventoryOptimizationTemplate);
    expect(geminiBlueprint.model.provider).toBe('gemini');
    
    const openaiTemplate = { ...minimalTemplate, default_config: { ...minimalTemplate.default_config, selectedModel: 'openai/gpt-5' } };
    const openaiBlueprint = templateToBlueprint(openaiTemplate);
    expect(openaiBlueprint.model.provider).toBe('openai');
  });

  it('should preserve all template metadata', () => {
    const blueprint = templateToBlueprint(inventoryOptimizationTemplate);
    
    expect(blueprint.tags).toEqual(inventoryOptimizationTemplate.tags);
    expect(blueprint.timeSavedPerWeek).toBe('25 hours/week');
    expect(blueprint.efficiencyGain).toBe('45% improvement');
  });
  
  it('should handle JSON file schema with nested blueprint object', () => {
    // Test template from JSON files like digital-twin-blueprints-3.json
    const jsonTemplate = {
      id: 'test-json-template',
      name: 'Test JSON Template',
      description: 'Template from JSON file',
      industry: 'Healthcare',
      department: 'Operations',
      twin_type: 'operational',
      certified: true,
      rating: 4.5,
      downloads: 100,
      roi_hint: 180,
      blueprint: {
        kpis: [
          { name: 'Processing Time', metric: 'days', target: 7 },
          { name: 'Approval Rate', metric: 'percentage', target: 72 },
        ],
        integrations: ['System A', 'System B'],
        workflow_steps: [
          { id: 'step1', type: 'process', label: 'Process Data' },
          { id: 'step2', type: 'action', label: 'Execute Action' },
        ],
      },
      llm: {
        provider: 'openai',
        model: 'gpt-5-mini',
        temperature: 0.2,
      },
      system_prompt: 'You are a test twin.',
      metrics_defaults: {
        time_saved_per_run_min: 180,
        runs_per_week: 45,
      },
    };
    
    const blueprint = templateToBlueprint(jsonTemplate, 'marketplace');
    
    // Should map JSON schema correctly
    expect(blueprint.name).toBe('Test JSON Template');
    expect(blueprint.type).toBe('operational');
    expect(blueprint.expectedRoi).toBe('180%');
    expect(blueprint.model.provider).toBe('openai');
    expect(blueprint.model.modelName).toBe('gpt-5-mini');
    expect(blueprint.model.temperature).toBe(0.2);
    expect(blueprint.behavior.systemPrompt).toBe('You are a test twin.');
    
    // Goals derived from blueprint.kpis
    expect(blueprint.goals).toContain('Processing Time: 7days');
    expect(blueprint.goals).toContain('Approval Rate: 72%');
    
    // Tools from blueprint.integrations
    expect(blueprint.tools.recommendedIntegrations).toEqual(['System A', 'System B']);
    
    // Workflow from blueprint.workflow_steps
    expect(blueprint.workflow.actions).toHaveLength(2);
    expect(blueprint.workflow.actions[0].name).toBe('Process Data');
    
    // Time saved calculated from metrics_defaults
    const expectedHoursPerWeek = Math.round((180 * 45) / 60);
    expect(blueprint.timeSavedPerWeek).toBe(`${expectedHoursPerWeek} hrs/week`);
  });
});

describe('Blueprint validation', () => {
  it('should create valid blueprints from all sources', () => {
    const questionnaireBlueprint = questionnaireToBlueprint(customerSupportAgentAnswers);
    const documentBlueprint = documentAnalysisToBlueprint(smallDocumentAnalysis);
    const templateBlueprint = templateToBlueprint(inventoryOptimizationTemplate);

    // Required fields
    [questionnaireBlueprint, documentBlueprint, templateBlueprint].forEach(bp => {
      expect(bp.source).toBeDefined();
      expect(bp.name).toBeDefined();
      expect(bp.description).toBeDefined();
      expect(bp.goals).toBeDefined();
      expect(bp.model).toBeDefined();
      expect(bp.knowledge).toBeDefined();
      expect(bp.behavior).toBeDefined();
      expect(bp.tools).toBeDefined();
      expect(bp.workflow).toBeDefined();
    });
  });

  it('should have consistent model configuration structure', () => {
    const blueprints = [
      questionnaireToBlueprint(customerSupportAgentAnswers),
      documentAnalysisToBlueprint(smallDocumentAnalysis),
      templateToBlueprint(inventoryOptimizationTemplate),
    ];

    blueprints.forEach(bp => {
      expect(bp.model.provider).toBeDefined();
      expect(bp.model.modelName).toBeDefined();
      expect(bp.model.temperature).toBeGreaterThanOrEqual(0);
      expect(bp.model.temperature).toBeLessThanOrEqual(1);
      expect(bp.model.topK).toBeDefined();
      expect(bp.model.topP).toBeDefined();
    });
  });
});

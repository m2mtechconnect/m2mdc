/**
 * YVR Test Utilities
 * Helper functions and fixtures for testing YVR template
 */

import type { ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';
import type { AgentBlueprint } from '@/types/agentBlueprint';

export const YVR_TEMPLATE_ID = 'YVR_AIRPORT_DIGITAL_TWIN';
export const YVR_TEMPLATE_SLUG = 'yvr-airport-digital-twin';

/**
 * Validate YVR template structure
 */
export function validateYVRTemplateStructure(template: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Core fields
  if (template.id !== YVR_TEMPLATE_ID) {
    errors.push(`Invalid ID: expected ${YVR_TEMPLATE_ID}, got ${template.id}`);
  }

  if (template.slug !== YVR_TEMPLATE_SLUG) {
    errors.push(`Invalid slug: expected ${YVR_TEMPLATE_SLUG}, got ${template.slug}`);
  }

  if (!template.name || !template.name.includes('YVR')) {
    errors.push('Name missing or does not contain YVR');
  }

  // Configuration
  if (!template.default_config) {
    errors.push('default_config missing');
  } else {
    const config = template.default_config;

    if (!config.preview_sections) {
      errors.push('preview_sections missing');
    }

    if (!config.kpi_block) {
      errors.push('kpi_block missing');
    }

    if (!config.roi_block) {
      errors.push('roi_block missing');
    }

    if (!config.workflows || !Array.isArray(config.workflows)) {
      errors.push('workflows missing or not an array');
    } else if (config.workflows.length < 3) {
      errors.push(`Expected at least 3 workflows, got ${config.workflows.length}`);
    }

    if (!config.blueprint_json) {
      errors.push('blueprint_json missing');
    }

    if (!config.cloud_metadata) {
      errors.push('cloud_metadata missing');
    } else {
      if (!config.cloud_metadata.aws) errors.push('AWS cloud metadata missing');
      if (!config.cloud_metadata.azure) errors.push('Azure cloud metadata missing');
      if (!config.cloud_metadata.gcp) errors.push('GCP cloud metadata missing');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate YVR blueprint structure after conversion
 */
export function validateYVRBlueprint(blueprint: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Source validation
  if (blueprint.source !== 'template') {
    errors.push('Blueprint source should be "template"');
  }

  if (blueprint.templateId !== YVR_TEMPLATE_ID) {
    errors.push(`Blueprint templateId should be ${YVR_TEMPLATE_ID}`);
  }

  // Step 1 validation
  if (!blueprint.name || !blueprint.name.includes('YVR')) {
    errors.push('Blueprint name missing or invalid');
  }

  if (!blueprint.description || blueprint.description.length < 50) {
    errors.push('Blueprint description missing or too short');
  }

  // Step 2 validation
  if (!blueprint.model) {
    errors.push('Model configuration missing');
  } else {
    if (!blueprint.model.provider) errors.push('Model provider missing');
    if (!blueprint.model.modelName) errors.push('Model name missing');
  }

  if (!blueprint.behavior || !blueprint.behavior.systemPrompt) {
    errors.push('System prompt missing');
  } else if (blueprint.behavior.systemPrompt.length < 100) {
    errors.push('System prompt too short');
  }

  // Step 3 validation
  if (!blueprint.tools) {
    errors.push('Tools configuration missing');
  } else {
    if (!Array.isArray(blueprint.tools.recommendedIntegrations)) {
      errors.push('Recommended integrations not an array');
    }
  }

  // Step 4 validation - CRITICAL
  if (!blueprint.workflow) {
    errors.push('Workflow configuration missing');
  } else {
    if (!Array.isArray(blueprint.workflow.triggers)) {
      errors.push('Workflow triggers not an array');
    }

    if (!Array.isArray(blueprint.workflow.actions)) {
      errors.push('Workflow actions not an array');
    } else if (blueprint.workflow.actions.length === 0) {
      errors.push('CRITICAL: Workflow actions array is empty - this causes deployment failures');
    }

    if (!Array.isArray(blueprint.workflow.integrations)) {
      errors.push('Workflow integrations not an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check for YVR-specific content in preview sections
 */
export function validateYVRPreviewContent(template: ValidatedTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const config = template.default_config as any;
  const previewSections = config?.preview_sections;

  if (!previewSections) {
    errors.push('preview_sections missing');
    return { valid: false, errors };
  }

  // Overview
  if (!previewSections.overview) {
    errors.push('overview section missing');
  }

  // Capabilities
  if (!previewSections.preview_capabilities || 
      !Array.isArray(previewSections.preview_capabilities.bullets) ||
      previewSections.preview_capabilities.bullets.length < 6) {
    errors.push('preview_capabilities missing or insufficient bullets');
  }

  // Day in the Life
  if (!previewSections.day_in_the_life || 
      !Array.isArray(previewSections.day_in_the_life.roles) ||
      previewSections.day_in_the_life.roles.length < 3) {
    errors.push('day_in_the_life missing or insufficient roles');
  }

  // Scenarios
  if (!Array.isArray(previewSections.scenarios) || 
      previewSections.scenarios.length < 3) {
    errors.push('scenarios missing or insufficient (need at least 3)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mock YVR template for testing
 */
export function createMockYVRTemplate(): Partial<ValidatedTemplate> {
  return {
    id: YVR_TEMPLATE_ID,
    slug: YVR_TEMPLATE_SLUG,
    name: 'YVR Airport Operations Digital Twin',
    description: 'Enterprise-grade Digital Twin for real-time airport operations',
    category: 'Aviation & Transportation',
    icon: '✈️',
    certified: true,
    rating: 4.8,
    downloads: 2847,
    roi_pct: 42,
    tags: ['Airport Operations', 'Passenger Experience', 'Real-Time Intelligence'],
    default_config: {
      provider: 'google',
      model: 'google/gemini-2.5-pro',
      temperature: 0.4,
      system_prompt: 'You are the YVR Airport Operations Digital Twin AI...',
      workflows: [
        {
          id: 'delay_prediction',
          name: 'Flight Delay Prediction',
          trigger: { type: 'weather_alert' },
          actions: [{ type: 'analyze_impact' }],
          outputs: ['predicted_delays'],
        },
      ],
    } as any,
  };
}

/**
 * Mock YVR blueprint for testing
 */
export function createMockYVRBlueprint(): Partial<AgentBlueprint> {
  return {
    source: 'template',
    templateId: YVR_TEMPLATE_ID,
    name: 'YVR Airport Operations Digital Twin',
    description: 'Enterprise-grade Digital Twin for real-time airport operations',
    industry: 'Aviation',
    department: 'Operations',
    goals: ['Predict delays', 'Optimize baggage handling', 'Monitor passenger flow'],
    model: {
      provider: 'google',
      modelName: 'google/gemini-2.5-pro',
      temperature: 0.4,
    },
    knowledge: {
      documents: [],
      urls: [],
      cloudDrives: {},
      summary: 'Flight tracking, weather, baggage systems',
    },
    behavior: {
      systemPrompt: 'You are the YVR Airport Operations Digital Twin AI...',
      communicationStyle: {
        formal: true,
        detailedExplanations: true,
      },
      safety: {
        hallucinationPrevention: true,
        requireCitations: true,
      },
    },
    tools: {
      recommendedIntegrations: ['weather_api', 'flight_tracking', 'slack'],
      preselectedIntegrations: [],
      customApis: [],
    },
    workflow: {
      templateType: 'auto',
      triggers: [{ name: 'weather_alert', type: 'trigger' }],
      actions: [{ name: 'analyze_impact', type: 'action' }],
      integrations: ['weather_api', 'slack'],
    },
    tags: ['Airport Operations', 'Aviation', 'Real-Time'],
    certified: true,
    rating: 4.8,
    downloads: 2847,
  };
}

/**
 * Assert YVR template meets minimum requirements
 */
export function assertYVRMinimumRequirements(template: ValidatedTemplate) {
  const validation = validateYVRTemplateStructure(template);
  if (!validation.valid) {
    throw new Error(`YVR template validation failed:\n${validation.errors.join('\n')}`);
  }

  const contentValidation = validateYVRPreviewContent(template);
  if (!contentValidation.valid) {
    throw new Error(`YVR preview content validation failed:\n${contentValidation.errors.join('\n')}`);
  }
}

/**
 * Assert YVR blueprint is deployment-ready
 */
export function assertYVRBlueprintDeploymentReady(blueprint: AgentBlueprint) {
  const validation = validateYVRBlueprint(blueprint);
  if (!validation.valid) {
    throw new Error(`YVR blueprint validation failed:\n${validation.errors.join('\n')}`);
  }

  // Critical check: workflow actions must not be empty
  if (!blueprint.workflow.actions || blueprint.workflow.actions.length === 0) {
    throw new Error('DEPLOYMENT BLOCKER: Workflow actions are empty. This will cause deployment to fail.');
  }
}

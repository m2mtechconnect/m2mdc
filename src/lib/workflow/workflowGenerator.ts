/**
 * Auto-Generated Workflow Engine
 * Generates valid workflows based on goal, industry, department, type, and template
 */

import { AllowedIndustry, AllowedDepartment } from '@/lib/digitalTwin/deterministicMapper';

export interface WorkflowConfig {
  triggers: string[];
  actions: string[];
  integrations: string[];
  hitl: string[];
}

export interface WorkflowGeneratorInput {
  goal?: string;
  industry?: string;
  department?: string;
  type?: 'agent' | 'process_twin' | '3d_twin' | null;
  template?: string;
}

/**
 * Generate a complete, valid workflow based on inputs
 * Guarantees at least 2 actions for deployment
 */
export function generateWorkflow(input: WorkflowGeneratorInput): WorkflowConfig {
  const { goal, industry, department, type, template } = input;

  const workflow: WorkflowConfig = {
    triggers: [],
    actions: [],
    integrations: [],
    hitl: [],
  };

  // Generate triggers based on type
  workflow.triggers = generateTriggers(type, department);

  // Generate actions based on goal, industry, department, type
  workflow.actions = generateActions(goal, industry, department, type);

  // Generate integrations based on department and industry
  workflow.integrations = generateIntegrations(industry, department);

  // Generate HITL (Human-in-the-Loop) based on department
  workflow.hitl = generateHITL(department, type);

  return workflow;
}

function generateTriggers(
  type?: 'agent' | 'process_twin' | '3d_twin' | null,
  department?: string
): string[] {
  const triggers: string[] = [];

  if (type === 'agent') {
    triggers.push('API Event Received');
    if (department === 'Customer Support') {
      triggers.push('New Support Ticket');
    } else if (department === 'Sales') {
      triggers.push('New Lead Created');
    } else if (department === 'Operations') {
      triggers.push('System Alert Triggered');
    } else {
      triggers.push('Scheduled Event');
    }
  } else if (type === 'process_twin') {
    triggers.push('Workflow Initiated');
    if (department === 'Finance' || department === 'Risk & Compliance') {
      triggers.push('Approval Request');
    } else {
      triggers.push('Process Step Completed');
    }
  } else if (type === '3d_twin') {
    triggers.push('Sensor Data Update');
    triggers.push('Asset Status Change');
  } else {
    // Default
    triggers.push('Event Triggered');
  }

  return triggers;
}

function generateActions(
  goal?: string,
  industry?: string,
  department?: string,
  type?: 'agent' | 'process_twin' | '3d_twin' | null
): string[] {
  const actions: string[] = [];

  // Always include at least 2 actions (required for deployment)
  if (type === 'agent') {
    actions.push('Process Data');
    
    if (department === 'Customer Support') {
      actions.push('Categorize Ticket');
      actions.push('Route to Agent');
    } else if (department === 'Sales') {
      actions.push('Qualify Lead');
      actions.push('Update CRM');
    } else if (department === 'Marketing') {
      actions.push('Segment Audience');
      actions.push('Send Campaign');
    } else if (department === 'Operations') {
      actions.push('Analyze Metrics');
      actions.push('Generate Alert');
    } else if (department === 'Finance') {
      actions.push('Calculate Risk Score');
      actions.push('Generate Report');
    } else {
      actions.push('Execute Task');
    }
    
    actions.push('Send Notification');
  } else if (type === 'process_twin') {
    actions.push('Simulate Process');
    actions.push('Calculate Outcomes');
    
    if (department === 'Finance' || department === 'Risk & Compliance') {
      actions.push('Evaluate Risk');
      actions.push('Request Approval');
    } else {
      actions.push('Optimize Workflow');
    }
    
    actions.push('Update Status');
  } else if (type === '3d_twin') {
    actions.push('Update 3D Model');
    actions.push('Analyze Spatial Data');
    actions.push('Monitor Asset Health');
    actions.push('Predict Maintenance');
  } else {
    // Default - ensure at least 2 actions
    actions.push('Process Request');
    actions.push('Execute Action');
    actions.push('Send Response');
  }

  return actions;
}

function generateIntegrations(industry?: string, department?: string): string[] {
  const integrations: string[] = [];

  // Department-specific integrations
  if (department === 'Sales') {
    integrations.push('Salesforce CRM');
    integrations.push('HubSpot');
  } else if (department === 'Customer Support') {
    integrations.push('Zendesk');
    integrations.push('Intercom');
  } else if (department === 'Marketing') {
    integrations.push('Mailchimp');
    integrations.push('Google Analytics');
  } else if (department === 'Finance') {
    integrations.push('QuickBooks');
    integrations.push('SAP');
  } else if (department === 'HR') {
    integrations.push('Workday');
    integrations.push('BambooHR');
  } else if (department === 'Operations') {
    integrations.push('Jira');
    integrations.push('Confluence');
  } else if (department === 'IT/Engineering') {
    integrations.push('GitHub');
    integrations.push('PagerDuty');
  }

  // Industry-specific integrations
  if (industry === 'Healthcare') {
    integrations.push('EHR System');
  } else if (industry === 'Manufacturing') {
    integrations.push('MES');
    integrations.push('SCADA');
  } else if (industry === 'Retail') {
    integrations.push('POS System');
  } else if (industry === 'Energy') {
    integrations.push('Grid Management');
  }

  // Common integrations
  if (integrations.length === 0) {
    integrations.push('Email');
    integrations.push('Slack');
    integrations.push('Database');
  } else {
    integrations.push('Email');
    integrations.push('Database');
  }

  return integrations;
}

function generateHITL(
  department?: string,
  type?: 'agent' | 'process_twin' | '3d_twin' | null
): string[] {
  const hitl: string[] = [];

  // HITL required for certain departments
  if (department === 'Finance' || department === 'Legal' || department === 'Risk & Compliance') {
    hitl.push('Manager Approval Required');
    if (type === 'process_twin') {
      hitl.push('Compliance Review');
    }
  } else if (department === 'HR') {
    hitl.push('HR Manager Review');
  } else if (type === 'process_twin') {
    // Process twins often need approval steps
    hitl.push('Workflow Approval');
  }

  return hitl;
}

/**
 * Validate that a workflow is deployment-ready
 */
export function validateWorkflowForDeployment(workflow: WorkflowConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!workflow.actions || workflow.actions.length === 0) {
    errors.push('At least one action is required');
  }

  if (!workflow.triggers || workflow.triggers.length === 0) {
    errors.push('At least one trigger is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

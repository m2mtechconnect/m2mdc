/**
 * Centralized validation for builder deployment
 * Must match backend requirements exactly from builders-deploy edge function
 */

export interface BuilderValidationField {
  field: string;
  label: string;
  step: number;
  check: (state: any) => boolean;
  errorMessage: string;
}

/**
 * REQUIRED FIELDS FOR DEPLOYMENT
 * These must match exactly what the backend expects in builders-deploy
 */
export const REQUIRED_FIELDS_FOR_DEPLOY: BuilderValidationField[] = [
  {
    field: 'goal',
    label: 'Goal',
    step: 0, // Set on dashboard, not in builder
    check: (state) => !!state.goal && state.goal.trim().length > 0,
    errorMessage: 'Goal is required (set on dashboard)'
  },
  {
    field: 'industry',
    label: 'Industry',
    step: 1,
    check: (state) => !!state.industry && state.industry !== 'Not selected' && state.industry.trim().length > 0,
    errorMessage: 'Industry is required'
  },
  {
    field: 'department',
    label: 'Department',
    step: 1,
    check: (state) => !!state.department && state.department.trim().length > 0,
    errorMessage: 'Department is required'
  },
  {
    field: 'type',
    label: 'Type',
    step: 1,
    check: (state) => !!state.type && ['agent', 'process_twin', '3d_twin'].includes(state.type),
    errorMessage: 'Type is required (should be set from session)'
  },
  {
    field: 'template',
    label: 'Template',
    step: 1,
    check: (state) => {
      // Template is optional - only required if explicitly referenced
      // Many blueprints don't have a template ID
      return true;
    },
    errorMessage: 'Template is required'
  },
  {
    field: 'workflow.actions',
    label: 'Workflow Actions',
    step: 4,
    check: (state) => state.workflow?.actions?.length > 0,
    errorMessage: 'At least one workflow action is required'
  },
  {
    field: 'model_config.model',
    label: 'Model Configuration',
    step: 4,
    check: (state) => !!state.modelConfig?.model,
    errorMessage: 'Model configuration is required'
  }
];

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    label: string;
    step: number;
    message: string;
  }>;
}

/**
 * Validate builder state for deployment readiness
 * Matches backend validation in builders-deploy edge function
 */
export function validateBuilderForDeploy(state: any): ValidationResult {
  const errors = REQUIRED_FIELDS_FOR_DEPLOY
    .filter(field => !field.check(state))
    .map(field => ({
      field: field.field,
      label: field.label,
      step: field.step,
      message: field.errorMessage
    }));

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Step 1 fields (Industry & Department) - formerly Step 2
 */
export function validateStep1(industry: string, department: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!industry || industry === 'Not selected' || industry.trim().length === 0) {
    errors.push('Industry is required');
  }
  
  if (!department || department.trim().length === 0) {
    errors.push('Department is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Step 2 field (Type) - formerly Step 3
 */
export function validateStep2(type: string | null): { isValid: boolean; error?: string } {
  if (!type) {
    return { isValid: false, error: 'Type is required' };
  }
  
  if (!['agent', 'process_twin', '3d_twin'].includes(type)) {
    return { isValid: false, error: 'Invalid type selected' };
  }
  
  return { isValid: true };
}

/**
 * Validate Step 3 field (Template) - formerly Step 4
 */
export function validateStep3(template: string): { isValid: boolean; error?: string } {
  if (!template || template.trim().length === 0) {
    return { isValid: false, error: 'Template is required' };
  }
  
  return { isValid: true };
}

/**
 * Validate Step 4 fields (Workflow) - formerly Step 5
 */
export function validateStep4(workflow: any, modelConfig: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!workflow?.actions || workflow.actions.length === 0) {
    errors.push('At least one workflow action is required');
  }
  
  if (!modelConfig?.model) {
    errors.push('Model configuration is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

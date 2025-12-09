/**
 * Workflow Auto-Repair Utilities
 * Automatically fixes common workflow validation issues
 */

export interface WorkflowAction {
  id?: string;
  type: string;
  config?: any;
  [key: string]: any;
}

export interface Workflow {
  triggers?: any[];
  actions?: WorkflowAction[];
  [key: string]: any;
}

/**
 * Auto-repair workflow issues to prevent deployment failures
 */
export function autoRepairWorkflow(workflow: Workflow | null | undefined): Workflow {
  if (!workflow) {
    console.warn('[WorkflowAutoRepair] No workflow provided, creating default');
    return {
      triggers: [],
      actions: [{
        id: 'default_log',
        type: 'log_event',
        config: { message: 'Workflow initialized' }
      }]
    };
  }

  const repaired: Workflow = { ...workflow };
  const repairs: string[] = [];

  // Fix 1: Ensure actions array exists
  if (!repaired.actions || !Array.isArray(repaired.actions)) {
    repaired.actions = [];
    repairs.push('Created missing actions array');
  }

  // Fix 2: If workflow has triggers but no actions, add safe log action
  if (repaired.triggers && repaired.triggers.length > 0 && repaired.actions.length === 0) {
    repaired.actions.push({
      id: 'auto_added_log',
      type: 'log_event',
      config: { 
        message: 'Workflow triggered',
        autoAdded: true 
      }
    });
    repairs.push('Added safe log_event action (had triggers but no actions)');
  }

  // Fix 3: Validate and normalize action IDs
  if (repaired.actions.length > 0) {
    repaired.actions = repaired.actions.map((action, index) => {
      if (!action.id) {
        return {
          ...action,
          id: `action_${index + 1}`
        };
      }
      return action;
    });
  }

  // Fix 4: Normalize old field names (frequency vs interval)
  if (repaired.triggers && Array.isArray(repaired.triggers)) {
    repaired.triggers = repaired.triggers.map(trigger => {
      if (trigger.frequency && !trigger.interval_seconds) {
        // Convert old frequency format to interval_seconds
        const normalized = { ...trigger };
        if (typeof trigger.frequency === 'string') {
          const match = trigger.frequency.match(/(\d+)([smh])/);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : 3600;
            normalized.interval_seconds = value * multiplier;
          }
        }
        repairs.push(`Normalized trigger frequency to interval_seconds`);
        return normalized;
      }
      return trigger;
    });
  }

  // Fix 5: Remove actions with missing required fields
  const validActions = repaired.actions.filter(action => {
    if (!action.type) {
      repairs.push(`Removed action without type: ${action.id || 'unknown'}`);
      return false;
    }
    return true;
  });

  if (validActions.length !== repaired.actions.length) {
    repaired.actions = validActions;
  }

  // Log all repairs
  if (repairs.length > 0) {
    console.log('[WorkflowAutoRepair] Applied repairs:', repairs);
  }

  return repaired;
}

/**
 * Validate workflow after repair
 */
export function validateRepairedWorkflow(workflow: Workflow): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!workflow.actions || workflow.actions.length === 0) {
    errors.push('Workflow must have at least one action');
  }

  if (workflow.actions) {
    workflow.actions.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action at index ${index} missing required "type" field`);
      }
      if (!action.id) {
        errors.push(`Action at index ${index} missing required "id" field`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

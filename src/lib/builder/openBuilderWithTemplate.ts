/**
 * Unified Template → Builder Entry Point
 * Single canonical pathway from any template selection to Builder
 */

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { templateToBlueprint } from './templateToBlueprint';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { trackIntakeComplete, trackBuilderOpened } from '@/lib/analytics/intakeTracking';
import { trackEvent } from '@/lib/telemetry';
import type { TemplateSourceEntry } from '@/types/agentBlueprint';

/**
 * Opens the 5-step Builder with a template fully pre-loaded
 * 
 * This is the ONLY function that should be used to open the Builder from a template.
 * It ensures consistent behavior across all template entry points:
 * - Dashboard "Start with a template"
 * - Template Marketplace page
 * - Builder Step 2 template selection
 * 
 * @param template - The template object from the marketplace/database
 * @param sourceEntry - Where the template was selected from
 * @param navigate - React Router navigate function
 * @param onSuccess - Optional callback after successful navigation
 */
export function openBuilderWithTemplate(
  template: any,
  sourceEntry: TemplateSourceEntry,
  navigate: ReturnType<typeof useNavigate>,
  onSuccess?: () => void
) {
  try {
    // Convert template to unified AgentBlueprint
    const blueprint = templateToBlueprint(template, sourceEntry);
    
    console.log('[openBuilderWithTemplate] Converting template to blueprint:', {
      templateId: template.id,
      templateName: template.name,
      sourceEntry,
      blueprintSource: blueprint.source,
      blueprintName: blueprint.name,
      blueprintIndustry: blueprint.industry,
      blueprintDepartment: blueprint.department,
      blueprintType: blueprint.type,
      hasDefaultConfig: !!template.default_config,
      hasGoals: blueprint.goals?.length || 0,
      hasWorkflow: (blueprint.workflow?.triggers?.length || 0) + (blueprint.workflow?.actions?.length || 0),
    });

    // Store blueprint in global state for Builder to hydrate from
    useBlueprintStore.getState().setBlueprint(blueprint);
    
    // Track analytics
    trackEvent('template.use_template', {
      templateId: template.id,
      templateName: template.name,
      sourceEntry,
      industry: template.industry,
      certified: template.certified || false,
    });
    
    trackIntakeComplete(blueprint);
    trackBuilderOpened(blueprint, 1);

    // Navigate to Builder Step 1
    navigate('/builder?step=1');
    
    // Show success message
    toast.success(`${template.name} loaded`, {
      description: 'Review and customize in the Builder, then deploy.',
    });
    
    // Call success callback if provided
    onSuccess?.();
    
  } catch (error) {
    console.error('[openBuilderWithTemplate] Failed to load template:', error);
    
    toast.error('Failed to load template', {
      description: 'Please try another template or contact support.',
    });
    
    throw error;
  }
}

/**
 * React hook version of openBuilderWithTemplate
 * Automatically provides the navigate function
 */
export function useOpenBuilderWithTemplate() {
  const navigate = useNavigate();
  
  return (template: any, sourceEntry: TemplateSourceEntry, onSuccess?: () => void) => {
    return openBuilderWithTemplate(template, sourceEntry, navigate, onSuccess);
  };
}

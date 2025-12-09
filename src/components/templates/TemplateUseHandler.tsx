/**
 * Template Use Handler
 * Unified handler for "Use This Template" action
 * Ensures all template usage flows through the same pipeline
 */

import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { startBuilderFromTemplate } from '@/lib/intake/unifiedIntakeService';
import { trackTemplateUse } from '@/lib/analytics/analyticsService';

export function useTemplateUseHandler() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUseTemplate = async (
    templateId: string,
    sourceEntry: 'dashboard' | 'marketplace' | 'builder' = 'marketplace'
  ) => {
    console.log('[TemplateUseHandler] Using template:', { templateId, sourceEntry });

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to use templates',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Track analytics using unified service
      await trackTemplateUse(templateId, 'Template', sourceEntry);

      // Show loading toast
      toast({
        title: 'Loading Template',
        description: 'Preparing your builder session...',
      });

      // Start builder from template using unified intake service
      const result = await startBuilderFromTemplate(templateId, user.id, sourceEntry);

      if (!result.success) {
        throw new Error(result.error || 'Failed to start builder');
      }

      console.log('[TemplateUseHandler] Builder session created:', result.sessionId);

      // Track success analytics
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'template_use_success',
        entity_type: 'builder_session',
        entity_id: result.sessionId,
        details: { templateId, sourceEntry },
      });

      // Navigate to builder
      toast({
        title: 'Template Loaded',
        description: 'Redirecting to builder...',
      });

      navigate(result.builderUrl);
    } catch (error) {
      console.error('[TemplateUseHandler] Error using template:', error);
      
      // Track error
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'template_use_error',
          entity_type: 'template',
          entity_id: templateId,
          details: { 
            sourceEntry,
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
        });
      }

      toast({
        title: 'Failed to Load Template',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return { handleUseTemplate };
}

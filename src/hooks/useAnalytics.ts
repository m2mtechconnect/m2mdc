import { supabase } from '@/integrations/supabase/client';

type AnalyticsEvent = 
  | 'aoc_viewed'
  | 'runtime_action'
  | 'simulation_run'
  | 'version_promoted'
  | 'version_rolled_back'
  | 'cloud_action'
  | 'workflow_error'
  | 'governance_accessed';

interface AnalyticsEventData {
  agentId?: string;
  action?: string;
  environment?: string;
  version?: string;
  error?: string;
  duration?: number;
  [key: string]: any;
}

export function useAnalytics() {
  const trackEvent = async (event: AnalyticsEvent, data: AnalyticsEventData = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: event,
        entity_type: 'agent',
        entity_id: data.agentId || null,
        details: data,
      });

      console.log(`Analytics: ${event}`, data);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  return { trackEvent };
}

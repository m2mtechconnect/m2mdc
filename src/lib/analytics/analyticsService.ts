/**
 * Unified Analytics Service
 * Tracks all user interactions to Supabase audit_logs
 */
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent =
  | 'template.preview_viewed'
  | 'template.use_clicked'
  | 'template.deployed'
  | 'builder.step_completed'
  | 'builder.opened'
  | 'builder.deploy_clicked'
  | 'builder.deploy_success'
  | 'builder.deploy_failed'
  | 'marketplace.visited'
  | 'dashboard.kpi_clicked'
  | 'simulation.run'
  | 'intake.started'
  | 'intake.completed';

interface AnalyticsMetadata {
  templateId?: string;
  templateName?: string;
  source?: string;
  step?: number;
  error?: string;
  [key: string]: any;
}

/**
 * Track analytics event to Supabase audit_logs
 */
export async function trackAnalytics(
  event: AnalyticsEvent,
  metadata?: AnalyticsMetadata
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[Analytics] No user session, skipping event:', event);
      return;
    }

    const entityId = metadata?.templateId || metadata?.systemId || null;
    const entityType = metadata?.templateId ? 'template' : metadata?.systemId ? 'agent' : 'event';

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: event,
      entity_type: entityType,
      entity_id: entityId,
      details: {
        ...metadata,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
    });

    console.log(`[Analytics] ${event}:`, metadata);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track template preview
 */
export function trackTemplatePreview(templateId: string, templateName: string, source: string) {
  return trackAnalytics('template.preview_viewed', {
    templateId,
    templateName,
    source,
  });
}

/**
 * Track template usage
 */
export function trackTemplateUse(templateId: string, templateName: string, source: string) {
  return trackAnalytics('template.use_clicked', {
    templateId,
    templateName,
    source,
  });
}

/**
 * Track builder step completion
 */
export function trackBuilderStep(step: number, metadata?: AnalyticsMetadata) {
  return trackAnalytics('builder.step_completed', {
    step,
    ...metadata,
  });
}

/**
 * Track deployment
 */
export function trackDeployment(systemId: string, success: boolean, error?: string) {
  return trackAnalytics(
    success ? 'builder.deploy_success' : 'builder.deploy_failed',
    {
      systemId,
      error,
    }
  );
}

/**
 * Track KPI click
 */
export function trackKPIClick(kpiKey: string, destination: string) {
  return trackAnalytics('dashboard.kpi_clicked', {
    kpiKey,
    destination,
  });
}

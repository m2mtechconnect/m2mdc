// Telemetry tracking for template usage and marketplace events

export type TelemetryEvent =
  | "template_preview"
  | "template_deploy_click"
  | "prefill_done"
  | "validate_ok"
  | "validate_fail"
  | "test_run_ok"
  | "test_run_fail"
  | "deploy_ok"
  | "deploy_fail"
  | "reco_fetch_start"
  | "reco_fetch_success"
  | "reco_fetch_empty"
  | "reco_fetch_error"
  | "reco_force_ingest"
  | "marketplace.view"
  | "marketplace.select"
  | "builder.deep_link"
  | "builder.template_select"
  | "builder.connect";

interface TelemetryData {
  templateId?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Generic event tracking for marketplace and builder
export async function trackEvent(event: string, data?: Record<string, any>) {
  console.log(`[Telemetry] ${event}:`, { ...data, timestamp: Date.now() });
  
  // Track to Supabase audit_logs
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: event,
        entity_type: 'analytics_event',
        details: {
          ...data,
          timestamp: Date.now(),
        },
      });
    }
  } catch (error) {
    console.error('[Telemetry] Failed to track event:', error);
  }
}

class TelemetryService {
  private events: Array<{ event: TelemetryEvent; data: TelemetryData }> = [];

  track(event: TelemetryEvent, data: Omit<TelemetryData, "timestamp">) {
    const eventData = {
      event,
      data: {
        ...data,
        timestamp: Date.now(),
      },
    };

    this.events.push(eventData);
    console.log(`[Telemetry] ${event}:`, eventData.data);

    // In production, would send to analytics service
    // Example: sendToAnalytics(eventData);
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}

export const telemetry = new TelemetryService();

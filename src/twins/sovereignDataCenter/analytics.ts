/**
 * Sovereign DC Twin - Analytics & Telemetry Events
 */

import { trackEvent } from '@/lib/telemetry';

export type SovereignDCAnalyticsEvent = 
  | 'sovereign_dc_template_viewed'
  | 'sovereign_dc_template_created'
  | 'sovereign_dc_simulation_run'
  | 'sovereign_dc_simulation_completed'
  | 'sovereign_dc_playbook_generated'
  | 'sovereign_dc_playbook_exported'
  | 'sovereign_dc_facility_switched'
  | 'sovereign_dc_scenario_selected'
  | 'sovereign_dc_kpi_drilldown'
  | 'sovereign_dc_copilot_query';

export interface SovereignDCAnalyticsData {
  facilityId?: string;
  facilityName?: string;
  region?: string;
  simulationType?: string;
  scenarioName?: string;
  kpiId?: string;
  query?: string;
  duration?: number;
  success?: boolean;
  error?: string;
}

/**
 * Track Sovereign DC Twin analytics event
 */
export async function trackSovereignDCEvent(
  event: SovereignDCAnalyticsEvent,
  data: SovereignDCAnalyticsData = {}
): Promise<void> {
  await trackEvent(event, {
    templateId: 'sovereign-data-center-twin',
    twinType: 'sovereign_data_center',
    ...data,
  });
}

/**
 * Pre-built tracking functions for common events
 */
export const sovereignDCAnalytics = {
  templateViewed: (facilityId?: string) => 
    trackSovereignDCEvent('sovereign_dc_template_viewed', { facilityId }),

  templateCreated: (facilityId: string, facilityName: string, region: string) => 
    trackSovereignDCEvent('sovereign_dc_template_created', { facilityId, facilityName, region }),

  simulationRun: (facilityId: string, simulationType: string, scenarioName: string) => 
    trackSovereignDCEvent('sovereign_dc_simulation_run', { facilityId, simulationType, scenarioName }),

  simulationCompleted: (facilityId: string, simulationType: string, duration: number, success: boolean) => 
    trackSovereignDCEvent('sovereign_dc_simulation_completed', { 
      facilityId, simulationType, duration, success 
    }),

  playbookGenerated: (facilityId: string) => 
    trackSovereignDCEvent('sovereign_dc_playbook_generated', { facilityId }),

  playbookExported: (facilityId: string, format: string) => 
    trackSovereignDCEvent('sovereign_dc_playbook_exported', { facilityId, scenarioName: format }),

  facilitySwitched: (facilityId: string, facilityName: string) => 
    trackSovereignDCEvent('sovereign_dc_facility_switched', { facilityId, facilityName }),

  scenarioSelected: (facilityId: string, simulationType: string) => 
    trackSovereignDCEvent('sovereign_dc_scenario_selected', { facilityId, simulationType }),

  kpiDrilldown: (facilityId: string, kpiId: string) => 
    trackSovereignDCEvent('sovereign_dc_kpi_drilldown', { facilityId, kpiId }),

  copilotQuery: (facilityId: string, query: string) => 
    trackSovereignDCEvent('sovereign_dc_copilot_query', { facilityId, query: query.slice(0, 100) }),
};

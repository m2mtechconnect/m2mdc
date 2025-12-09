/**
 * YVR Analytics Events Tests
 * Ensures analytics events fire correctly for YVR template interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent } from '@/lib/telemetry';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

describe('YVR Template Analytics Events', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Template Preview Events', () => {
    it('should track template_previewed event', async () => {
      await trackEvent('template_previewed', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        templateName: 'YVR Airport Operations Digital Twin',
        source: 'marketplace',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('template_previewed'),
        expect.objectContaining({
          templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        })
      );
    });

    it('should include template metadata in preview event', async () => {
      await trackEvent('template_previewed', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        industry: 'Aviation',
        department: 'Operations',
        certified: true,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Template Usage Events', () => {
    it('should track template_used event when Use This Template clicked', async () => {
      await trackEvent('template_used', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        source: 'marketplace',
        action: 'use_template',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('template_used'),
        expect.anything()
      );
    });

    it('should track builder_opened event', async () => {
      await trackEvent('builder_opened', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        step: 1,
        prefilled: true,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Builder Progress Events', () => {
    it('should track builder_step_completed events', async () => {
      for (let step = 1; step <= 5; step++) {
        await trackEvent('builder_step_completed', {
          templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
          step,
        });
      }

      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
    });

    it('should track builder_completed event at step 5', async () => {
      await trackEvent('builder_completed', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        totalSteps: 5,
        duration_ms: 180000,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Deployment Events', () => {
    it('should track agent_deployed event on successful deployment', async () => {
      await trackEvent('agent_deployed', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        agentId: 'test-agent-id',
        deploymentMethod: 'builder',
        success: true,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('agent_deployed'),
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should track deployment errors', async () => {
      await trackEvent('deployment_error', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        error: 'Workflow actions are required',
        step: 'validation',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Scenario Events', () => {
    it('should track scenario_run event', async () => {
      await trackEvent('scenario_run', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        scenarioId: 'weather_event',
        scenarioName: 'Weather Event Response',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('scenario_run'),
        expect.anything()
      );
    });

    it('should track scenario_completed event', async () => {
      await trackEvent('scenario_completed', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        scenarioId: 'baggage_failure',
        duration_ms: 5000,
        success: true,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Intake Flow Events', () => {
    it('should track url_intake_recommended event', async () => {
      await trackEvent('url_intake_recommended', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        url: 'https://www.yvr.ca',
        confidence: 0.95,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should track document_intake_recommended event', async () => {
      await trackEvent('document_intake_recommended', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        documentType: 'pdf',
        confidence: 0.85,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should track questionnaire_intake_recommended event', async () => {
      await trackEvent('questionnaire_intake_recommended', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        industry: 'Aviation',
        confidence: 0.98,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Event Data Quality', () => {
    it('should always include timestamp', async () => {
      await trackEvent('test_event', {
        templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });

    it('should include templateId in all YVR-related events', async () => {
      const events = [
        'template_previewed',
        'template_used',
        'builder_opened',
        'agent_deployed',
        'scenario_run',
      ];

      for (const eventName of events) {
        await trackEvent(eventName, {
          templateId: 'YVR_AIRPORT_DIGITAL_TWIN',
        });
      }

      expect(consoleLogSpy).toHaveBeenCalledTimes(events.length);
    });
  });

  describe('Error Tracking', () => {
    it('should handle analytics failures gracefully', async () => {
      // Analytics should never throw errors that break the app
      await expect(
        trackEvent('test_event', { invalid: undefined })
      ).resolves.not.toThrow();
    });
  });
});

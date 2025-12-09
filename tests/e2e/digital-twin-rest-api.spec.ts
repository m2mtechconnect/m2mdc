/**
 * Digital Twin REST API E2E Tests
 * Tests the edge functions for triggering and querying twin runs
 */

import { test, expect } from '@playwright/test';

test.describe('Digital Twin REST API', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (will redirect to auth if needed)
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForTimeout(2000);
  });

  test('should create a twin and trigger an event via API', async ({ page }) => {
    // This test verifies the full API flow:
    // 1. Create a twin
    // 2. Trigger an event
    // 3. List runs
    // 4. Get run details

    // Create a test twin via the create edge function
    const createResponse = await page.evaluate(async () => {
      const supabase = (window as any).supabase;
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const twinData = {
        name: 'API Test Twin',
        slug: 'api-test-twin-' + Date.now(),
        description: 'Twin for testing REST API',
        status: 'active',
        config: {
          version: '1.0.0',
          entities: [
            {
              id: 'entity-1',
              type: 'system',
              name: 'Test System',
              properties: {},
            },
          ],
          events: [
            {
              id: 'test_event',
              type: 'workflow_trigger',
              name: 'Test Event',
              triggers: ['node-1'],
            },
          ],
          workflow: {
            entryPoint: 'node-1',
            nodes: [
              {
                id: 'node-1',
                type: 'trigger',
                name: 'Start',
                description: 'Entry point',
                config: {},
                nextNodes: ['node-2'],
              },
              {
                id: 'node-2',
                type: 'transform',
                name: 'Update State',
                description: 'Set processed flag',
                config: {
                  stateUpdates: {
                    processed: true,
                  },
                },
              },
            ],
          },
          settings: {
            enableLogging: true,
          },
        },
      };

      const { data, error } = await supabase.functions.invoke('digital-twin-create', {
        body: twinData,
      });

      if (error) throw error;
      return data;
    });

    expect(createResponse.success).toBe(true);
    expect(createResponse.data).toBeDefined();
    expect(createResponse.data.twin).toBeDefined();

    const twinId = createResponse.data.twin.id;
    const twinSlug = createResponse.data.twin.slug;

    // Trigger an event
    const triggerResponse = await page.evaluate(async (params) => {
      const supabase = (window as any).supabase;
      
      const { data, error } = await supabase.functions.invoke('digital-twin-event', {
        body: {
          twin_id: params.twinId,
          event_id: 'test_event',
          payload: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    }, { twinId });

    expect(triggerResponse.success).toBe(true);
    expect(triggerResponse.data).toBeDefined();
    expect(triggerResponse.data.run).toBeDefined();
    expect(triggerResponse.data.run.status).toBe('completed');
    expect(triggerResponse.data.run.runId).toBeDefined();

    const runId = triggerResponse.data.run.runId;

    // List runs for the twin
    const listResponse = await page.evaluate(async (params) => {
      const supabase = (window as any).supabase;
      
      const { data, error } = await supabase.functions.invoke(
        `digital-twin-runs-list?twin_id=${params.twinId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data;
    }, { twinId });

    expect(listResponse.success).toBe(true);
    expect(listResponse.data).toBeDefined();
    expect(listResponse.data.runs).toBeDefined();
    expect(listResponse.data.runs.length).toBeGreaterThan(0);
    expect(listResponse.data.runs[0].event_id).toBe('test_event');

    // Get run details
    const getResponse = await page.evaluate(async (params) => {
      const supabase = (window as any).supabase;
      
      const { data, error } = await supabase.functions.invoke(
        `digital-twin-run-get?run_id=${params.runId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data;
    }, { runId });

    expect(getResponse.success).toBe(true);
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data.run).toBeDefined();
    expect(getResponse.data.run.run_id).toBe(runId);
    expect(getResponse.data.run.logs).toBeDefined();
    expect(getResponse.data.run.logs.length).toBeGreaterThan(0);
    expect(getResponse.data.run.twin).toBeDefined();
    expect(getResponse.data.run.twin.slug).toBe(twinSlug);
  });

  test('should handle validation errors', async ({ page }) => {
    // Test missing required fields
    const response = await page.evaluate(async () => {
      const supabase = (window as any).supabase;
      
      const { data, error } = await supabase.functions.invoke('digital-twin-event', {
        body: {
          // Missing twin_id and twin_slug
          event_id: 'test_event',
          payload: {},
        },
      });

      // Edge function errors come through as successful HTTP responses
      // but with success: false in the data
      return data || { success: false, error: { message: error?.message } };
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe('VALIDATION_ERROR');
  });

  test('should handle twin not found errors', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const supabase = (window as any).supabase;
      
      const { data, error } = await supabase.functions.invoke('digital-twin-event', {
        body: {
          twin_id: '00000000-0000-0000-0000-000000000000',
          event_id: 'test_event',
          payload: {},
        },
      });

      return data || { success: false, error: { message: error?.message } };
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe('NOT_FOUND');
  });

  test('should filter runs by status', async ({ page }) => {
    // Create twin and trigger event first
    const setup = await page.evaluate(async () => {
      const supabase = (window as any).supabase;
      
      const twin = await supabase.functions.invoke('digital-twin-create', {
        body: {
          name: 'Status Filter Test',
          slug: 'status-filter-' + Date.now(),
          status: 'active',
          config: {
            version: '1.0.0',
            entities: [{ id: 'e1', type: 'system', name: 'Test', properties: {} }],
            events: [{ id: 'evt1', type: 'workflow_trigger', name: 'Event 1' }],
            workflow: {
              entryPoint: 'n1',
              nodes: [{ id: 'n1', type: 'trigger', name: 'Start', config: {} }],
            },
          },
        },
      });

      const trigger = await supabase.functions.invoke('digital-twin-event', {
        body: {
          twin_id: twin.data.data.twin.id,
          event_id: 'evt1',
          payload: {},
        },
      });

      return {
        twinId: twin.data.data.twin.id,
        status: trigger.data.data.run.status,
      };
    });

    // List with status filter
    const response = await page.evaluate(async (params) => {
      const supabase = (window as any).supabase;
      
      const { data } = await supabase.functions.invoke(
        `digital-twin-runs-list?twin_id=${params.twinId}&status=${params.status}`,
        { method: 'GET' }
      );

      return data;
    }, setup);

    expect(response.success).toBe(true);
    expect(response.data.runs).toBeDefined();
    if (response.data.runs.length > 0) {
      expect(response.data.runs[0].status).toBe(setup.status);
    }
  });
});

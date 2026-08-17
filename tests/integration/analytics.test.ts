import { describe, it, expect, beforeAll } from 'vitest';
import { describeWithBackend } from '../_setup/backendSuite';
import { supabase } from '@/integrations/supabase/client';

describeWithBackend('Analytics API Integration', () => {
  let testUserId: string;
  let testSystemId: string;

  beforeAll(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      testUserId = session.session.user.id;

      // Get or create a test system
      const { data: systems } = await supabase
        .from('agents')
        .select('id')
        .eq('owner_id', testUserId)
        .limit(1);

      if (systems && systems.length > 0) {
        testSystemId = systems[0].id;
      }
    }
  });

  it('should fetch ROI metrics', async () => {
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();

    const { data, error } = await supabase.rpc('rpc_kpi_roi_growth', {
      from: fromDate,
      to: toDate,
      org_id: null,
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('roi_pct');
    expect(data).toHaveProperty('delta_pct');
  });

  it('should fetch time saved metrics', async () => {
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();

    const { data, error } = await supabase.rpc('rpc_kpi_time_saved', {
      from: fromDate,
      to: toDate,
      org_id: null,
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('hours');
    expect(data).toHaveProperty('delta_hours');
    expect(data.hours).toBeGreaterThanOrEqual(0);
  });

  it('should fetch compliance accuracy', async () => {
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();

    const { data, error } = await supabase.rpc('rpc_kpi_compliance_accuracy', {
      from: fromDate,
      to: toDate,
      org_id: null,
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('accuracy_pct');
    expect(data).toHaveProperty('delta_pct');
    expect(data.accuracy_pct).toBeGreaterThanOrEqual(0);
    expect(data.accuracy_pct).toBeLessThanOrEqual(100);
  });

  it('should fetch agents deployed count', async () => {
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();

    const { data, error } = await supabase.rpc('rpc_kpi_agents_deployed', {
      from: fromDate,
      to: toDate,
      org_id: null,
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('active_count');
    expect(data).toHaveProperty('delta_count');
    expect(data.active_count).toBeGreaterThanOrEqual(0);
  });

  it('should query agent runs with filters', async () => {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should export analytics data', async () => {
    const { data, error } = await supabase.functions.invoke('analytics-export', {
      body: {
        type: 'runs',
        format: 'csv',
        dateRange: { from: '2024-01-01', to: new Date().toISOString() },
      },
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('should calculate system metrics summary', async () => {
    if (!testSystemId) {
      return; // Skip if no test system
    }

    const { data, error } = await supabase.functions.invoke('metrics-summary', {
      body: { systemId: testSystemId },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('totalRuns');
    expect(data).toHaveProperty('avgLatency');
    expect(data).toHaveProperty('successRate');
  });

  it('should retrieve system health metrics', async () => {
    if (!testSystemId) {
      return;
    }

    const { data, error } = await supabase
      .from('system_health')
      .select('*')
      .eq('system_id', testSystemId)
      .order('observed_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should track search analytics', async () => {
    const { data, error } = await supabase
      .from('search_analytics')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { describeWithBackend } from '../_setup/backendSuite';
import { supabase } from '@/integrations/supabase/client';

describeWithBackend('Operations Monitor API', () => {
  let testUserId: string;
  let testSystemId: string;

  beforeAll(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      testUserId = session.session.user.id;

      const { data: systems } = await supabase
        .from('agents')
        .select('id')
        .eq('owner_id', testUserId)
        .eq('status', 'active')
        .limit(1);

      if (systems && systems.length > 0) {
        testSystemId = systems[0].id;
      }
    }
  });

  it('should fetch operations overview', async () => {
    const { data, error } = await supabase.functions.invoke('ops-overview', {
      body: {},
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('environments');
    expect(data).toHaveProperty('totalSystems');
  });

  it('should retrieve system health data', async () => {
    const { data, error } = await supabase.functions.invoke('health-ai', {
      body: { systemId: testSystemId },
    });

    if (testSystemId) {
      expect(error).toBeNull();
      expect(data).toHaveProperty('health');
    }
  });

  it('should list environments', async () => {
    const { data, error } = await supabase.functions.invoke('ops-environments', {
      body: {},
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('environments');
    expect(Array.isArray(data.environments)).toBe(true);
  });

  it('should query system events', async () => {
    const { data, error } = await supabase.functions.invoke('ops-events', {
      body: {
        systemId: testSystemId,
        limit: 10,
      },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('events');
  });

  it('should check system heartbeats', async () => {
    const { data, error } = await supabase.functions.invoke('ops-heartbeat', {
      body: { systemId: testSystemId },
    });

    if (testSystemId) {
      expect(error).toBeNull();
      expect(data).toHaveProperty('lastHeartbeat');
    }
  });

  it('should retrieve health metrics by environment', async () => {
    const { data: envs } = await supabase
      .from('environments')
      .select('id, name')
      .limit(1)
      .single();

    if (!envs) return;

    const { data, error } = await supabase.functions.invoke('ops-systems', {
      body: { environmentId: envs.id },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('systems');
  });

  it('should ingest health metrics', async () => {
    if (!testSystemId) return;

    const { data, error } = await supabase.functions.invoke('ops-ingest-health', {
      body: {
        systemId: testSystemId,
        metrics: {
          uptime_pct: 99.5,
          errors_24h: 2,
          latency_ms: 250,
          throughput_rpm: 75,
          cpu_load_pct: 35,
          mem_load_pct: 55,
        },
      },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('success');
  });

  it('should filter systems by environment', async () => {
    const { data: env } = await supabase
      .from('environments')
      .select('id')
      .eq('name', 'Production')
      .single();

    if (!env) return;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('environment_id', env.id)
      .eq('owner_id', testUserId);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should retrieve system event log', async () => {
    if (!testSystemId) return;

    const { data, error } = await supabase
      .from('system_events')
      .select('*')
      .eq('system_id', testSystemId)
      .order('occurred_at', { ascending: false })
      .limit(20);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should query health time series', async () => {
    if (!testSystemId) return;

    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('system_health')
      .select('*')
      .eq('system_id', testSystemId)
      .gte('observed_at', fromDate)
      .order('observed_at', { ascending: true });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

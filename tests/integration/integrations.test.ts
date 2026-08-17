import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { describeWithBackend } from '../_setup/backendSuite';
import { supabase } from '@/integrations/supabase/client';

describeWithBackend('Integrations API', () => {
  let testUserId: string;
  let testIntegrationId: string;

  beforeAll(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      testUserId = session.session.user.id;
    }
  });

  afterEach(async () => {
    // Cleanup test integrations
    if (testIntegrationId) {
      await supabase.from('integrations').delete().eq('id', testIntegrationId);
      testIntegrationId = '';
    }
  });

  it('should list available integrations', async () => {
    const { data, error } = await supabase.functions.invoke('integrations-list', {
      body: {},
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('integrations');
    expect(Array.isArray(data.integrations)).toBe(true);
  });

  it('should connect a new integration', async () => {
    const { data, error } = await supabase.functions.invoke('integrations-connect', {
      body: {
        provider: 'google_drive',
        name: 'Test Drive',
        category: 'storage',
        credentials: { token: 'test-token' },
      },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('status');
    
    if (data?.id) {
      testIntegrationId = data.id;
    }
  });

  it('should test integration connection', async () => {
    // Create test integration first
    const { data: integration } = await supabase
      .from('integrations')
      .insert({
        user_id: testUserId,
        provider: 'jira',
        name: 'Test Jira',
        status: 'connected',
      })
      .select()
      .single();

    testIntegrationId = integration!.id;

    const { data, error } = await supabase.functions.invoke('integrations-test', {
      body: { integrationId: testIntegrationId },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('success');
  });

  it('should disconnect integration', async () => {
    // Create test integration
    const { data: integration } = await supabase
      .from('integrations')
      .insert({
        user_id: testUserId,
        provider: 'salesforce',
        name: 'Test Salesforce',
        status: 'connected',
      })
      .select()
      .single();

    testIntegrationId = integration!.id;

    const { data, error } = await supabase.functions.invoke('integrations-disconnect', {
      body: { integrationId: testIntegrationId },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('success');

    // Verify status changed
    const { data: updated } = await supabase
      .from('integrations')
      .select('status')
      .eq('id', testIntegrationId)
      .single();

    expect(updated?.status).toBe('disconnected');
  });

  it('should handle Zapier webhook setup', async () => {
    const { data, error } = await supabase.functions.invoke('integrations-zapier', {
      body: {
        action: 'setup',
        app: 'slack',
        webhookUrl: 'https://hooks.zapier.com/test',
      },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('success');
  });

  it('should retrieve integration logs', async () => {
    const { data, error } = await supabase
      .from('integration_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // May be empty or restricted by RLS
    expect(error).toBeNull();
  });

  it('should update integration settings', async () => {
    const { data: integration } = await supabase
      .from('integrations')
      .insert({
        user_id: testUserId,
        provider: 'sharepoint',
        name: 'Test SharePoint',
        status: 'connected',
        config: { folder: '/documents' },
      })
      .select()
      .single();

    testIntegrationId = integration!.id;

    const { data, error } = await supabase
      .from('integrations')
      .update({
        config: { folder: '/shared' },
      })
      .eq('id', testIntegrationId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.config.folder).toBe('/shared');
  });

  it('should handle OAuth callback flow', async () => {
    const { data, error } = await supabase.functions.invoke('integrations-connect', {
      body: {
        provider: 'google_drive',
        name: 'OAuth Test',
        category: 'storage',
        authCode: 'test-auth-code',
      },
    });

    // Mock will handle this
    expect(error).toBeNull();
    
    if (data?.id) {
      testIntegrationId = data.id;
    }
  });

  it('should track last sync time', async () => {
    const { data: integration } = await supabase
      .from('integrations')
      .insert({
        user_id: testUserId,
        provider: 'confluence',
        name: 'Test Confluence',
        status: 'connected',
      })
      .select()
      .single();

    testIntegrationId = integration!.id;

    // Update last sync
    const { data, error } = await supabase
      .from('integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', testIntegrationId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.last_sync).toBeTruthy();
  });
});

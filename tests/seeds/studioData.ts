/**
 * Seed data for M2M Agentic Studio
 * Creates sample environments, systems, templates, connectors, files, etc.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SeedOptions {
  clear?: boolean;
  userId?: string;
}

export async function seedStudioData(options: SeedOptions = {}) {
  const { clear = false, userId } = options;

  console.log('🌱 Seeding M2M Agentic Studio data...');

  try {
    // Get or create test user
    const user = userId || (await getOrCreateTestUser());

    if (clear) {
      console.log('🧹 Clearing existing data...');
      await clearTestData(user);
    }

    // Seed environments
    const environments = await seedEnvironments();
    console.log(`✅ Created ${environments.length} environments`);

    // Seed templates
    const templates = await seedTemplates();
    console.log(`✅ Created ${templates.length} templates`);

    // Seed systems
    const systems = await seedSystems(user, environments[0].id);
    console.log(`✅ Created ${systems.length} AI systems`);

    // Seed integrations
    const integrations = await seedIntegrations(user);
    console.log(`✅ Created ${integrations.length} integrations`);

    // Seed knowledge sources
    const sources = await seedKnowledgeSources(user);
    console.log(`✅ Created ${sources.length} knowledge sources`);

    // Seed runs and metrics
    await seedRunsAndMetrics(user, systems);
    console.log(`✅ Created run history and metrics`);

    // Seed health data
    await seedHealthData(systems);
    console.log(`✅ Created system health data`);

    console.log('🎉 Seed complete!');

    return {
      user,
      environments,
      templates,
      systems,
      integrations,
      sources,
    };
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

async function getOrCreateTestUser(): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  if (session?.session?.user) {
    return session.session.user.id;
  }

  // Create test user
  const { data, error } = await supabase.auth.signUp({
    email: 'test@m2m.studio',
    password: 'testpass123',
  });

  if (error) throw error;
  return data.user!.id;
}

async function clearTestData(userId: string) {
  // Clear in reverse dependency order
  await supabase.from('workflow_run_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('workflow_runs').delete().eq('created_by', userId);
  await supabase.from('workflow_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('workflow_nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('workflows').delete().eq('created_by', userId);
  await supabase.from('system_integrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('deployments').delete().eq('deployed_by', userId);
  await supabase.from('agent_runs').delete().eq('user_id', userId);
  await supabase.from('agents').delete().eq('owner_id', userId);
  await supabase.from('integrations').delete().eq('user_id', userId);
  await supabase.from('knowledge_sources').delete().eq('user_id', userId);
}

async function seedEnvironments() {
  const envs = [
    { name: 'Production' },
    { name: 'Staging' },
    { name: 'Development' },
  ];

  const { data, error } = await supabase
    .from('environments')
    .upsert(envs, { onConflict: 'name' })
    .select();

  if (error) throw error;
  return data;
}

async function seedTemplates() {
  // Templates are static data, just verify they exist
  const { data } = await supabase.from('agent_templates').select('*').limit(5);
  return data || [];
}

async function seedSystems(userId: string, envId: string) {
  const systems = [
    {
      owner_id: userId,
      name: 'Compliance AI Assistant',
      description: 'GDPR compliance monitoring and reporting',
      status: 'active',
      template_id: 'compliance',
      environment_id: envId,
      config: {
        model: 'google/gemini-2.5-flash',
        grounding: true,
        temperature: 0.3,
        topK: 10,
      },
    },
    {
      owner_id: userId,
      name: 'Predictive Maintenance Bot',
      description: 'Equipment failure prediction',
      status: 'active',
      template_id: 'predictive',
      environment_id: envId,
      config: {
        model: 'openai/gpt-5-mini',
        grounding: true,
      },
    },
    {
      owner_id: userId,
      name: 'Finance Report Automation',
      description: 'Automated financial reporting',
      status: 'draft',
      template_id: 'finance',
      config: {},
    },
  ];

  const { data, error } = await supabase.from('agents').insert(systems).select();
  if (error) throw error;

  // Create workflows for active systems
  for (const system of data.filter((s) => s.status === 'active')) {
    await seedWorkflow(userId, system.id);
  }

  return data;
}

async function seedWorkflow(userId: string, systemId: string) {
  const { data: workflow } = await supabase
    .from('workflows')
    .insert({
      system_id: systemId,
      created_by: userId,
      version: 'v1',
    })
    .select()
    .single();

  if (!workflow) return;

  // Add nodes
  const nodes = [
    { type: 'analyze', x: 100, y: 100, config: { prompt: 'Analyze input' } },
    { type: 'classify', x: 300, y: 100, config: { categories: ['urgent', 'normal'] } },
    { type: 'notify_teams', x: 500, y: 100, config: { channel: 'alerts' } },
  ];

  const { data: createdNodes } = await supabase
    .from('workflow_nodes')
    .insert(nodes.map((n) => ({ ...n, workflow_id: workflow.id })))
    .select();

  // Add edges
  if (createdNodes && createdNodes.length > 1) {
    await supabase.from('workflow_edges').insert([
      {
        workflow_id: workflow.id,
        from_node_id: createdNodes[0].id,
        to_node_id: createdNodes[1].id,
      },
      {
        workflow_id: workflow.id,
        from_node_id: createdNodes[1].id,
        to_node_id: createdNodes[2].id,
      },
    ]);
  }
}

async function seedIntegrations(userId: string) {
  const integrations = [
    {
      user_id: userId,
      name: 'Google Drive',
      provider: 'google_drive',
      category: 'storage',
      status: 'connected',
      connect_method: 'oauth',
    },
    {
      user_id: userId,
      name: 'Jira',
      provider: 'jira',
      category: 'project_management',
      status: 'connected',
      connect_method: 'zapier',
    },
    {
      user_id: userId,
      name: 'Salesforce',
      provider: 'salesforce',
      category: 'crm',
      status: 'disconnected',
    },
  ];

  const { data, error } = await supabase.from('integrations').insert(integrations).select();
  if (error) throw error;
  return data;
}

async function seedKnowledgeSources(userId: string) {
  const sources = [
    {
      user_id: userId,
      name: 'GDPR Documentation',
      description: 'Official GDPR compliance docs',
      tags: ['compliance', 'gdpr'],
    },
    {
      user_id: userId,
      name: 'Equipment Manuals',
      description: 'Maintenance procedures',
      tags: ['maintenance', 'equipment'],
    },
  ];

  const { data, error } = await supabase.from('knowledge_sources').insert(sources).select();
  if (error) throw error;
  return data;
}

async function seedRunsAndMetrics(userId: string, systems: any[]) {
  const activeSystems = systems.filter((s) => s.status === 'active');

  for (const system of activeSystems) {
    // Create 20 runs over the past 30 days
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const status = Math.random() > 0.1 ? 'completed' : 'failed';

      await supabase.from('agent_runs').insert({
        agent_id: system.id,
        user_id: userId,
        status,
        input: { query: `Test query ${i}` },
        output: status === 'completed' ? { answer: `Response ${i}` } : null,
        error: status === 'failed' ? 'Timeout error' : null,
        duration_ms: Math.floor(Math.random() * 3000) + 500,
        citations: status === 'completed' ? [{ source: 'Test', snippet: 'Example' }] : [],
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }
}

async function seedHealthData(systems: any[]) {
  for (const system of systems.filter((s) => s.status === 'active')) {
    // Create health data for the past 7 days
    for (let i = 0; i < 7; i++) {
      await supabase.from('system_health').insert({
        system_id: system.id,
        uptime_pct: 95 + Math.random() * 5,
        errors_24h: Math.floor(Math.random() * 5),
        latency_ms: 200 + Math.random() * 300,
        throughput_rpm: Math.floor(Math.random() * 100) + 50,
        cpu_load_pct: 20 + Math.random() * 30,
        mem_load_pct: 40 + Math.random() * 20,
        observed_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Create heartbeats
    await supabase.from('heartbeats').insert({
      system_id: system.id,
      beat_at: new Date().toISOString(),
    });
  }
}

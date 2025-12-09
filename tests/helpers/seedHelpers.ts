/**
 * Test Database Seeding Helpers
 * Provides utilities for creating realistic test data for integration tests
 */

import { supabase } from '@/integrations/supabase/client';

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface TestSystem {
  id: string;
  name: string;
  status: string;
  owner_id: string;
}

export interface SeedResult {
  user: TestUser;
  systems: TestSystem[];
  templates: any[];
  integrations: any[];
  workflows: any[];
}

/**
 * Creates a test user and signs them in
 */
export async function createTestUser(email?: string): Promise<TestUser> {
  const userEmail = email || `test-${Date.now()}@test.com`;
  const password = 'test-password-123';

  const { data, error } = await supabase.auth.signUp({
    email: userEmail,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('User creation failed');

  return {
    id: data.user.id,
    email: userEmail,
    password,
  };
}

/**
 * Signs in a test user
 */
export async function signInTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Creates multiple test systems for a user
 */
export async function createTestSystems(
  userId: string,
  count: number = 3
): Promise<TestSystem[]> {
  const systems = Array.from({ length: count }, (_, i) => ({
    owner_id: userId,
    name: `Test System ${i + 1}`,
    description: `Test system description ${i + 1}`,
    status: i === 0 ? 'active' : i === 1 ? 'draft' : 'deployed',
    template_id: ['compliance', 'finance', 'predictive'][i % 3],
    config: {
      model: 'google/gemini-2.5-flash',
      grounding: true,
      temperature: 0.3,
    },
  }));

  const { data, error } = await supabase.from('agents').insert(systems).select();

  if (error) throw error;
  return data as TestSystem[];
}

/**
 * Creates test integrations for a user
 */
export async function createTestIntegrations(userId: string, count: number = 3) {
  const integrations = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    name: ['Google Drive', 'Slack', 'Salesforce'][i % 3],
    provider: ['google_drive', 'slack', 'salesforce'][i % 3],
    category: ['storage', 'communication', 'crm'][i % 3],
    status: i === 0 ? 'connected' : 'disconnected',
    connect_method: i === 0 ? 'oauth' : 'api_key',
  }));

  const { data, error } = await supabase
    .from('integrations')
    .insert(integrations)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Creates test workflows with nodes and edges
 */
export async function createTestWorkflows(userId: string, systemIds: string[]) {
  const workflows = [];

  for (const systemId of systemIds) {
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        system_id: systemId,
        created_by: userId,
        version: 'v1',
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Add nodes
    const nodes = [
      { type: 'analyze', x: 100, y: 100, config: { prompt: 'Analyze input' } },
      { type: 'classify', x: 300, y: 100, config: { categories: ['urgent', 'normal'] } },
      { type: 'notify_teams', x: 500, y: 100, config: { channel: 'alerts' } },
    ];

    const { data: createdNodes, error: nodesError } = await supabase
      .from('workflow_nodes')
      .insert(nodes.map((n) => ({ ...n, workflow_id: workflow.id })))
      .select();

    if (nodesError) throw nodesError;

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

    workflows.push({ ...workflow, nodes: createdNodes });
  }

  return workflows;
}

/**
 * Creates test agent runs with realistic data
 */
export async function createTestRuns(
  userId: string,
  systemId: string,
  count: number = 20
) {
  const runs = Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 30);
    const status = Math.random() > 0.1 ? 'completed' : 'failed';

    return {
      agent_id: systemId,
      user_id: userId,
      status,
      input: { query: `Test query ${i}` },
      output: status === 'completed' ? { answer: `Response ${i}` } : null,
      error: status === 'failed' ? 'Timeout error' : null,
      duration_ms: Math.floor(Math.random() * 3000) + 500,
      citations: status === 'completed' ? [{ source: 'Test', snippet: 'Example' }] : [],
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  const { data, error } = await supabase.from('agent_runs').insert(runs).select();

  if (error) throw error;
  return data;
}

/**
 * Creates test knowledge sources
 */
export async function createTestKnowledgeSources(userId: string, count: number = 3) {
  const sources = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    name: `Knowledge Source ${i + 1}`,
    description: `Test knowledge source ${i + 1}`,
    tags: ['test', `category-${i}`],
  }));

  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert(sources)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Complete seed function that creates a full test environment
 */
export async function seedTestEnvironment(
  options: {
    systemsCount?: number;
    integrationsCount?: number;
    runsCount?: number;
    sourcesCount?: number;
  } = {}
): Promise<SeedResult> {
  const {
    systemsCount = 3,
    integrationsCount = 3,
    runsCount = 20,
    sourcesCount = 3,
  } = options;

  // Create test user
  const user = await createTestUser();
  await signInTestUser(user.email, user.password);

  // Create systems
  const systems = await createTestSystems(user.id, systemsCount);

  // Create integrations
  const integrations = await createTestIntegrations(user.id, integrationsCount);

  // Create workflows
  const workflows = await createTestWorkflows(
    user.id,
    systems.map((s) => s.id)
  );

  // Create runs for active systems
  const activeSystems = systems.filter((s) => s.status === 'active');
  for (const system of activeSystems) {
    await createTestRuns(user.id, system.id, runsCount);
  }

  // Create knowledge sources
  await createTestKnowledgeSources(user.id, sourcesCount);

  // Get templates
  const { data: templates } = await supabase
    .from('agent_templates')
    .select('*')
    .limit(5);

  return {
    user,
    systems,
    templates: templates || [],
    integrations,
    workflows,
  };
}

/**
 * Cleanup function to remove test data
 */
export async function cleanupTestData(userId: string) {
  // Delete in reverse dependency order
  await supabase.from('workflow_run_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('workflow_runs').delete().eq('created_by', userId);
  await supabase.from('workflow_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('workflow_nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('workflows').delete().eq('created_by', userId);
  await supabase.from('agent_runs').delete().eq('user_id', userId);
  await supabase.from('integrations').delete().eq('user_id', userId);
  await supabase.from('knowledge_sources').delete().eq('user_id', userId);
  await supabase.from('agents').delete().eq('owner_id', userId);
  await supabase.from('deployment_tracking').delete().eq('deployed_by', userId);

  // Delete user
  await supabase.auth.admin.deleteUser(userId);
}

/**
 * Quick seed for specific test scenarios
 */
export const quickSeeds = {
  /**
   * Creates a user with one active system and workflow
   */
  singleActiveSystem: async () => {
    const user = await createTestUser();
    await signInTestUser(user.email, user.password);
    const systems = await createTestSystems(user.id, 1);
    const workflows = await createTestWorkflows(user.id, [systems[0].id]);
    return { user, system: systems[0], workflow: workflows[0] };
  },

  /**
   * Creates a user with multiple systems in different states
   */
  multipleSystemStates: async () => {
    const user = await createTestUser();
    await signInTestUser(user.email, user.password);
    const systems = await createTestSystems(user.id, 5);
    return { user, systems };
  },

  /**
   * Creates a user with connected integrations
   */
  connectedIntegrations: async () => {
    const user = await createTestUser();
    await signInTestUser(user.email, user.password);
    const integrations = await createTestIntegrations(user.id, 5);
    return { user, integrations };
  },

  /**
   * Creates a complete builder flow scenario
   */
  completeBuilderFlow: async () => {
    const user = await createTestUser();
    await signInTestUser(user.email, user.password);
    const systems = await createTestSystems(user.id, 1);
    const integrations = await createTestIntegrations(user.id, 2);
    const workflows = await createTestWorkflows(user.id, [systems[0].id]);
    const sources = await createTestKnowledgeSources(user.id, 2);
    return { user, system: systems[0], integrations, workflow: workflows[0], sources };
  },
};

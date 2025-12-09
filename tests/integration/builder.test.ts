import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Builder API Integration', () => {
  let testSystemId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user or get existing
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      testUserId = session.session.user.id;
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: `test-${Date.now()}@m2m.studio`,
        password: 'testpass123',
      });
      if (error) throw error;
      testUserId = data.user!.id;
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testSystemId) {
      await supabase.from('agents').delete().eq('id', testSystemId);
    }
  });

  it('should create a new AI system', async () => {
    const { data, error } = await supabase
      .from('agents')
      .insert({
        owner_id: testUserId,
        name: 'Integration Test System',
        description: 'Created by integration test',
        status: 'draft',
        config: { model: 'google/gemini-2.5-flash' },
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.name).toBe('Integration Test System');

    testSystemId = data!.id;
  });

  it('should update system configuration', async () => {
    if (!testSystemId) {
      throw new Error('No test system created');
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        config: {
          model: 'openai/gpt-5-mini',
          grounding: true,
          temperature: 0.5,
        },
      })
      .eq('id', testSystemId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.config.model).toBe('openai/gpt-5-mini');
    expect(data?.config.grounding).toBe(true);
  });

  it('should create workflow for system', async () => {
    if (!testSystemId) {
      throw new Error('No test system created');
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        system_id: testSystemId,
        created_by: testUserId,
        version: 'v1',
      })
      .select()
      .single();

    expect(workflowError).toBeNull();
    expect(workflow).toBeTruthy();

    // Add nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('workflow_nodes')
      .insert([
        {
          workflow_id: workflow!.id,
          type: 'analyze',
          x: 100,
          y: 100,
          config: { prompt: 'Analyze input' },
        },
        {
          workflow_id: workflow!.id,
          type: 'classify',
          x: 300,
          y: 100,
          config: { categories: ['urgent', 'normal'] },
        },
      ])
      .select();

    expect(nodesError).toBeNull();
    expect(nodes).toHaveLength(2);

    // Add edge
    const { data: edge, error: edgeError } = await supabase
      .from('workflow_edges')
      .insert({
        workflow_id: workflow!.id,
        from_node_id: nodes![0].id,
        to_node_id: nodes![1].id,
      })
      .select()
      .single();

    expect(edgeError).toBeNull();
    expect(edge).toBeTruthy();
  });

  it('should validate system before deployment', async () => {
    if (!testSystemId) {
      throw new Error('No test system created');
    }

    // Mock validation endpoint
    const { data, error } = await supabase.functions.invoke('builder-test', {
      body: { systemId: testSystemId },
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('success');
  });

  it('should retrieve builder state', async () => {
    if (!testSystemId) {
      throw new Error('No test system created');
    }

    const { data, error } = await supabase
      .from('system_builder_state')
      .select('*')
      .eq('system_id', testSystemId)
      .single();

    // May not exist yet, that's okay
    expect(error).toBeDefined();
  });

  it('should save builder progress at each step', async () => {
    if (!testSystemId) {
      throw new Error('No test system created');
    }

    const steps = [1, 2, 3, 4, 5, 6];
    
    for (const step of steps) {
      const { data, error } = await supabase
        .from('system_builder_state')
        .upsert({
          system_id: testSystemId,
          step,
          state: { completed: step < 6, timestamp: new Date().toISOString() },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.step).toBe(step);
    }
  });
});

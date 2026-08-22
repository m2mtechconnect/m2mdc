import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { describeWithBackend } from '../_setup/backendSuite';
import { act } from '@testing-library/react';
import { useBuilderStore } from '@/stores/builderStore';
import { supabase } from '@/integrations/supabase/client';
import {
  seedTestEnvironment,
  cleanupTestData,
  quickSeeds,
  createTestRuns,
} from '../helpers/seedHelpers';
import { TestDataFactory } from '../helpers/testDataFactory';

describeWithBackend('Builder Flow with Seed Helpers', () => {
  let seedResult: any;

  afterEach(async () => {
    if (seedResult?.user?.id) {
      await cleanupTestData({ userId: seedResult.user.id, allOwnedData: true });
    }
  });

  describe('Quick Seed Scenarios', () => {
    it('should load pre-seeded system data', async () => {
      seedResult = await quickSeeds.singleActiveSystem();

      expect(seedResult.system).toBeDefined();
      expect(seedResult.system.status).toBe('active');
      expect(seedResult.workflow).toBeDefined();

      // Verify workflow has nodes
      const { data: nodes } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', seedResult.workflow.id);

      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);
    });

    it('should handle multiple system states', async () => {
      seedResult = await quickSeeds.multipleSystemStates();

      expect(seedResult.systems).toBeDefined();
      expect(seedResult.systems.length).toBeGreaterThanOrEqual(3);

      // Verify different statuses
      const statuses = seedResult.systems.map((s: any) => s.status);
      expect(new Set(statuses).size).toBeGreaterThan(1);
    });

    it('should load connected integrations', async () => {
      seedResult = await quickSeeds.connectedIntegrations();

      expect(seedResult.integrations).toBeDefined();
      expect(seedResult.integrations.length).toBeGreaterThan(0);

      // Verify at least one is connected
      const connectedCount = seedResult.integrations.filter(
        (i: any) => i.status === 'connected'
      ).length;
      expect(connectedCount).toBeGreaterThan(0);
    });

    it('should complete builder flow scenario', async () => {
      seedResult = await quickSeeds.completeBuilderFlow();

      expect(seedResult.system).toBeDefined();
      expect(seedResult.integrations).toBeDefined();
      expect(seedResult.workflow).toBeDefined();
      expect(seedResult.sources).toBeDefined();

      // Verify all components are linked
      expect(seedResult.workflow.system_id).toBe(seedResult.system.id);
      expect(seedResult.integrations[0].user_id).toBe(seedResult.user.id);
      expect(seedResult.sources[0].user_id).toBe(seedResult.user.id);
    });
  });

  describe('Full Environment Seeding', () => {
    it('should create complete test environment', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 5,
        integrationsCount: 4,
        runsCount: 30,
        sourcesCount: 6,
      });

      expect(seedResult.user).toBeDefined();
      expect(seedResult.systems).toHaveLength(5);
      expect(seedResult.integrations).toHaveLength(4);
      expect(seedResult.workflows).toHaveLength(5);

      // Verify runs were created for active systems
      const activeSystems = seedResult.systems.filter(
        (s: any) => s.status === 'active'
      );

      for (const system of activeSystems) {
        const { data: runs } = await supabase
          .from('agent_runs')
          .select('*')
          .eq('agent_id', system.id);

        expect(runs).toBeDefined();
        expect(runs!.length).toBeGreaterThan(0);
      }
    });

    it('should handle custom seed configuration', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 2,
        integrationsCount: 1,
        runsCount: 10,
        sourcesCount: 2,
      });

      expect(seedResult.systems).toHaveLength(2);
      expect(seedResult.integrations).toHaveLength(1);

      // Verify knowledge sources
      const { data: sources } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('user_id', seedResult.user.id);

      expect(sources).toBeDefined();
      expect(sources!.length).toBe(2);
    });
  });

  describe('Test Data Factory', () => {
    it('should generate realistic agent configs', async () => {
      seedResult = await quickSeeds.singleActiveSystem();

      // Generate test configs
      const configs = TestDataFactory.batch.agents(5, {
        owner_id: seedResult.user.id,
      });

      expect(configs).toHaveLength(5);
      configs.forEach((config) => {
        expect(config.name).toBeDefined();
        expect(config.config.model).toBeDefined();
        expect(config.owner_id).toBe(seedResult.user.id);
      });

      // Insert generated configs
      const { data: systems, error } = await supabase
        .from('agents')
        .insert(configs)
        .select();

      expect(error).toBeNull();
      expect(systems).toHaveLength(5);
    });

    it('should generate realistic runs', async () => {
      seedResult = await quickSeeds.singleActiveSystem();

      const runs = TestDataFactory.batch.runs(20, {
        agent_id: seedResult.system.id,
        user_id: seedResult.user.id,
      });

      expect(runs).toHaveLength(20);

      const { data: insertedRuns, error } = await supabase
        .from('agent_runs')
        .insert(runs)
        .select();

      expect(error).toBeNull();
      expect(insertedRuns).toHaveLength(20);

      // Verify variety in statuses
      const statuses = new Set(insertedRuns!.map((r) => r.status));
      expect(statuses.size).toBeGreaterThan(1);
    });

    it('should generate realistic integrations', () => {
      const integrations = TestDataFactory.batch.integrations(10);

      expect(integrations).toHaveLength(10);
      integrations.forEach((integration) => {
        expect(integration.name).toBeDefined();
        expect(integration.provider).toBeDefined();
        expect(integration.category).toBeDefined();
        expect(['connected', 'disconnected', 'error']).toContain(
          integration.status
        );
      });
    });
  });

  describe('Builder Store Integration with Seeds', () => {
    it('should load seeded system into builder store', async () => {
      seedResult = await quickSeeds.completeBuilderFlow();
      const store = useBuilderStore.getState();

      // Load seeded system
      await act(async () => {
        await store.load(seedResult.system.id);
      });

      expect(store.systemId).toBe(seedResult.system.id);
      expect(store.state.systemName).toBe(seedResult.system.name);
      expect(store.state.workflowNodes).toBeDefined();
    });

    it('should update seeded system', async () => {
      seedResult = await quickSeeds.singleActiveSystem();
      const store = useBuilderStore.getState();

      // Load system
      await act(async () => {
        await store.load(seedResult.system.id);
      });

      // Update state
      act(() => {
        store.setState({
          outcome: 'Updated via integration test',
          successMetric: 'Test metric updated',
        });
      });

      // Save
      await act(async () => {
        await store.save();
      });

      // Verify update in database
      const { data: updatedSystem } = await supabase
        .from('agents')
        .select('*')
        .eq('id', seedResult.system.id)
        .single();

      expect(updatedSystem?.config?.outcome).toBe(
        'Updated via integration test'
      );
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should handle large number of runs efficiently', async () => {
      seedResult = await quickSeeds.singleActiveSystem();

      const startTime = Date.now();

      // Create 100 runs using helper
      await createTestRuns(seedResult.user.id, seedResult.system.id, 100);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify runs were created
      const { data: runs, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', seedResult.system.id);

      expect(error).toBeNull();
      expect(runs).toBeDefined();
      expect(runs!.length).toBeGreaterThanOrEqual(100);
    });

    it('should handle multiple systems with workflows', async () => {
      const startTime = Date.now();

      seedResult = await seedTestEnvironment({
        systemsCount: 10,
        integrationsCount: 5,
        runsCount: 50,
        sourcesCount: 10,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);

      expect(seedResult.systems).toHaveLength(10);
      expect(seedResult.workflows).toHaveLength(10);

      // Verify each system has workflow nodes
      for (const workflow of seedResult.workflows) {
        expect(workflow.nodes).toBeDefined();
        expect(workflow.nodes.length).toBeGreaterThan(0);
      }
    });
  });
});

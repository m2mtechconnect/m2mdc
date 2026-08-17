import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { describeWithBackend } from '../_setup/backendSuite';
import { supabase } from '@/integrations/supabase/client';
import {
  seedTestEnvironment,
  cleanupTestData,
  createTestRuns,
} from '../helpers/seedHelpers';
import { TestDataFactory } from '../helpers/testDataFactory';

describeWithBackend('Analytics with Realistic Seed Data', () => {
  let seedResult: any;

  afterEach(async () => {
    if (seedResult?.user?.id) {
      await cleanupTestData(seedResult.user.id);
    }
  });

  describe('Dashboard Analytics', () => {
    it('should calculate metrics from seeded data', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 3,
        integrationsCount: 5,
        runsCount: 100,
        sourcesCount: 5,
      });

      // Query analytics data
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('user_id', seedResult.user.id);

      expect(runs).toBeDefined();
      expect(runs!.length).toBeGreaterThanOrEqual(100);

      // Calculate success rate
      const completedRuns = runs!.filter((r) => r.status === 'completed');
      const successRate = (completedRuns.length / runs!.length) * 100;

      expect(successRate).toBeGreaterThan(0);
      expect(successRate).toBeLessThanOrEqual(100);

      // Calculate average duration
      const avgDuration =
        completedRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
        completedRuns.length;

      expect(avgDuration).toBeGreaterThan(0);
    });

    it('should handle time-based queries', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 2,
        runsCount: 50,
      });

      const activeSystems = seedResult.systems.filter(
        (s: any) => s.status === 'active'
      );

      // Query runs from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data: recentRuns } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', activeSystems[0].id)
        .gte('created_at', sevenDaysAgo.toISOString());

      expect(recentRuns).toBeDefined();
      expect(recentRuns!.length).toBeGreaterThan(0);
    });
  });

  describe('System Health Monitoring', () => {
    it('should track error rates from runs', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 1,
        runsCount: 200,
      });

      const systemId = seedResult.systems[0].id;

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', systemId);

      const failedRuns = runs!.filter((r) => r.status === 'failed');
      const errorRate = (failedRuns.length / runs!.length) * 100;

      expect(errorRate).toBeGreaterThanOrEqual(0);
      expect(errorRate).toBeLessThan(50); // Should have mostly successful runs
    });

    it('should identify slow-performing systems', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 3,
        runsCount: 100,
      });

      for (const system of seedResult.systems) {
        const { data: runs } = await supabase
          .from('agent_runs')
          .select('duration_ms')
          .eq('agent_id', system.id)
          .eq('status', 'completed');

        if (runs && runs.length > 0) {
          const avgDuration =
            runs.reduce((sum, r) => sum + r.duration_ms!, 0) / runs.length;

          expect(avgDuration).toBeGreaterThan(0);
          expect(avgDuration).toBeLessThan(10000); // Should be under 10s
        }
      }
    });
  });

  describe('Integration Health', () => {
    it('should track integration usage', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 2,
        integrationsCount: 5,
        runsCount: 50,
      });

      const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', seedResult.user.id);

      expect(integrations).toBeDefined();
      expect(integrations!.length).toBe(5);

      // Check connection status distribution
      const connected = integrations!.filter((i) => i.status === 'connected');
      expect(connected.length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality Validation', () => {
    it('should validate seeded run data integrity', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 1,
        runsCount: 100,
      });

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', seedResult.systems[0].id);

      // Validate all runs have required fields
      runs!.forEach((run) => {
        expect(run.id).toBeDefined();
        expect(run.agent_id).toBe(seedResult.systems[0].id);
        expect(run.user_id).toBe(seedResult.user.id);
        expect(run.status).toMatch(/completed|failed|running/);
        expect(run.input).toBeDefined();
        expect(run.created_at).toBeDefined();

        // Completed runs should have output
        if (run.status === 'completed') {
          expect(run.output).toBeDefined();
          expect(run.duration_ms).toBeGreaterThan(0);
        }

        // Failed runs should have error
        if (run.status === 'failed') {
          expect(run.error).toBeDefined();
        }
      });
    });

    it('should validate workflow data completeness', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 2,
      });

      for (const workflow of seedResult.workflows) {
        expect(workflow.id).toBeDefined();
        expect(workflow.system_id).toBeDefined();
        expect(workflow.created_by).toBe(seedResult.user.id);
        expect(workflow.nodes).toBeDefined();
        expect(workflow.nodes.length).toBeGreaterThan(0);

        // Verify nodes have required fields
        workflow.nodes.forEach((node: any) => {
          expect(node.id).toBeDefined();
          expect(node.workflow_id).toBe(workflow.id);
          expect(node.type).toBeDefined();
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.y).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe('Stress Testing with Large Datasets', () => {
    it('should handle querying large result sets', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 5,
        runsCount: 500,
      });

      const startTime = Date.now();

      const { data: allRuns, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('user_id', seedResult.user.id)
        .order('created_at', { ascending: false });

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(allRuns).toBeDefined();
      expect(allRuns!.length).toBeGreaterThanOrEqual(500);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2s
    });

    it('should handle complex aggregation queries', async () => {
      seedResult = await seedTestEnvironment({
        systemsCount: 3,
        runsCount: 300,
      });

      const startTime = Date.now();

      // Complex aggregation: group by system and status
      const { data: aggregated, error } = await supabase
        .from('agent_runs')
        .select('agent_id, status')
        .eq('user_id', seedResult.user.id);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(aggregated).toBeDefined();
      expect(queryTime).toBeLessThan(1500);

      // Manual aggregation
      const groupedBySystem = aggregated!.reduce((acc: any, run) => {
        if (!acc[run.agent_id]) {
          acc[run.agent_id] = { completed: 0, failed: 0, total: 0 };
        }
        acc[run.agent_id][run.status]++;
        acc[run.agent_id].total++;
        return acc;
      }, {});

      expect(Object.keys(groupedBySystem).length).toBeGreaterThan(0);
    });
  });
});

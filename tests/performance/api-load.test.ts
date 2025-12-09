import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { supabase } from '@/integrations/supabase/client';
import { seedTestEnvironment, cleanupTestData, createTestRuns } from '../helpers/seedHelpers';
import { TestDataFactory } from '../helpers/testDataFactory';

/**
 * API Endpoint Load Tests
 * Tests system performance under realistic data volumes
 */

describe('API Load Tests with Realistic Data', () => {
  let testUserId: string;
  let testSystemIds: string[] = [];

  beforeAll(async () => {
    // Seed a comprehensive test environment
    const seedResult = await seedTestEnvironment({
      systemsCount: 10,
      integrationsCount: 5,
      runsCount: 100,
      sourcesCount: 10,
    });
    
    testUserId = seedResult.user.id;
    testSystemIds = seedResult.systems.map(s => s.id);
  }, 60000); // 60s timeout for seeding

  afterAll(async () => {
    if (testUserId) {
      await cleanupTestData(testUserId);
    }
  });

  describe('Metrics Summary Endpoint', () => {
    it('should handle dashboard metrics calculation within 2s with 100+ runs', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase.functions.invoke('metrics-summary');
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toHaveProperty('roi');
      expect(data).toHaveProperty('timeSavedHours');
      expect(data).toHaveProperty('complianceRate');
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent metrics requests efficiently', async () => {
      const start = performance.now();
      
      const requests = Array.from({ length: 10 }, () =>
        supabase.functions.invoke('metrics-summary')
      );
      
      const results = await Promise.all(requests);
      
      const end = performance.now();
      const duration = end - start;

      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
      
      // All 10 requests should complete in under 3s
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('AI Systems Endpoint', () => {
    it('should retrieve 10 systems within 1s', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase.functions.invoke('ai-systems');
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle paginated requests efficiently', async () => {
      const pageSize = 5;
      const start = performance.now();
      
      const { data: page1 } = await supabase.functions.invoke('ai-systems', {
        body: { limit: pageSize, offset: 0 }
      });
      
      const { data: page2 } = await supabase.functions.invoke('ai-systems', {
        body: { limit: pageSize, offset: pageSize }
      });
      
      const end = performance.now();
      const duration = end - start;

      expect(page1).toBeInstanceOf(Array);
      expect(page2).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Recent Runs Endpoint', () => {
    it('should retrieve 100 runs within 1.5s', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase.functions.invoke('runs-recent', {
        body: { limit: 100 }
      });
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(1500);
    });

    it('should handle filtering by system efficiently', async () => {
      const systemId = testSystemIds[0];
      const start = performance.now();
      
      const { data, error } = await supabase.functions.invoke('runs-recent', {
        body: { systemId, limit: 50 }
      });
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond within 500ms', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase.functions.invoke('health');
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toHaveProperty('status');
      expect(duration).toBeLessThan(500);
    });

    it('should handle burst traffic of 20 concurrent requests', async () => {
      const start = performance.now();
      
      const requests = Array.from({ length: 20 }, () =>
        supabase.functions.invoke('health')
      );
      
      const results = await Promise.all(requests);
      
      const end = performance.now();
      const duration = end - start;

      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
      
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('High Volume Data Tests', () => {
    it('should handle 500 agent runs efficiently', async () => {
      const systemId = testSystemIds[0];
      
      // Create 500 runs
      const start = performance.now();
      const runs = TestDataFactory.batch.runs(500, { agent_id: systemId, user_id: testUserId });
      
      const { error: insertError } = await supabase
        .from('agent_runs')
        .insert(runs);
      
      expect(insertError).toBeNull();
      
      // Query them
      const queryStart = performance.now();
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', systemId)
        .limit(100);
      
      const queryEnd = performance.now();
      const queryDuration = queryEnd - queryStart;
      
      const totalDuration = queryEnd - start;

      expect(error).toBeNull();
      expect(data).toHaveLength(100);
      expect(queryDuration).toBeLessThan(1000);
      expect(totalDuration).toBeLessThan(10000);
    });

    it('should handle concurrent writes without race conditions', async () => {
      const systemId = testSystemIds[1];
      const start = performance.now();
      
      const writePromises = Array.from({ length: 10 }, (_, i) => {
        const runs = TestDataFactory.batch.runs(10, { 
          agent_id: systemId, 
          user_id: testUserId 
        });
        return supabase.from('agent_runs').insert(runs);
      });
      
      const results = await Promise.all(writePromises);
      
      const end = performance.now();
      const duration = end - start;

      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
      
      // Verify total count
      const { count } = await supabase
        .from('agent_runs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', systemId);
      
      expect(count).toBeGreaterThanOrEqual(100); // 10 batches * 10 runs
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Complex Query Performance', () => {
    it('should handle joins and aggregations efficiently', async () => {
      const start = performance.now();
      
      // Complex query: systems with their run counts and success rates
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          status,
          agent_runs(count)
        `)
        .eq('owner_id', testUserId);
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(2000);
    });

    it('should handle time-based aggregations within 2s', async () => {
      const start = performance.now();
      
      // Get runs from last 30 days grouped by day
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('agent_runs')
        .select('created_at, status, duration_ms')
        .eq('user_id', testUserId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Stress Tests', () => {
    it('should maintain performance with mixed read/write operations', async () => {
      const start = performance.now();
      
      const operations = [
        // Reads
        supabase.functions.invoke('metrics-summary'),
        supabase.functions.invoke('ai-systems'),
        supabase.functions.invoke('runs-recent', { body: { limit: 50 } }),
        
        // Writes
        supabase.from('agent_runs').insert(
          TestDataFactory.batch.runs(5, { 
            agent_id: testSystemIds[0], 
            user_id: testUserId 
          })
        ),
        
        // More reads
        supabase.functions.invoke('health'),
        supabase.from('agents').select('*').eq('owner_id', testUserId),
      ];
      
      const results = await Promise.all(operations);
      
      const end = performance.now();
      const duration = end - start;

      results.forEach((result) => {
        expect(result.error).toBeNull();
      });
      
      expect(duration).toBeLessThan(3000);
    });

    it('should handle sequential heavy operations efficiently', async () => {
      const iterations = 5;
      const timings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await supabase.functions.invoke('metrics-summary');
        
        const end = performance.now();
        timings.push(end - start);
      }
      
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTiming = Math.max(...timings);
      
      expect(avgTiming).toBeLessThan(1500);
      expect(maxTiming).toBeLessThan(2500);
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should handle large result sets without memory issues', async () => {
      const start = performance.now();
      
      // Create 1000 runs
      const largeDataset = TestDataFactory.batch.runs(1000, {
        agent_id: testSystemIds[2],
        user_id: testUserId,
      });
      
      const { error: insertError } = await supabase
        .from('agent_runs')
        .insert(largeDataset);
      
      expect(insertError).toBeNull();
      
      // Query with pagination
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', testSystemIds[2])
        .range(0, 999);
      
      const end = performance.now();
      const duration = end - start;

      expect(error).toBeNull();
      expect(data).toHaveLength(1000);
      expect(duration).toBeLessThan(15000); // Allow more time for large dataset
    });
  });
});

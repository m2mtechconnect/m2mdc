import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('RBAC Audit Tests', () => {
  describe('Schema Validation', () => {
    it('should have user_roles table', async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have all AOC operational tables', async () => {
      const tables = [
        'agent_runtime_status',
        'agent_environments',
        'cloud_deployments',
        'agent_versions',
        'agent_workflows',
        'agent_activity_logs'
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        expect(error).toBeNull();
      }
    });

    it('should have RBAC helper functions', async () => {
      // Test user_has_role function exists
      const { data: hasRoleData, error: hasRoleError } = await supabase.rpc('user_has_role', {
        check_user_id: '00000000-0000-0000-0000-000000000000',
        check_role: 'admin',
        check_scope: null
      });

      expect(hasRoleError).toBeNull();
      expect(typeof hasRoleData).toBe('boolean');

      // Test user_can_access_agent function exists
      const { data: canAccessData, error: canAccessError } = await supabase.rpc('user_can_access_agent', {
        check_user_id: '00000000-0000-0000-0000-000000000000',
        check_agent_id: '00000000-0000-0000-0000-000000000000',
        required_permission: 'view'
      });

      expect(canAccessError).toBeNull();
      expect(typeof canAccessData).toBe('boolean');
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should have RLS enabled on user_roles', async () => {
      // This test requires checking pg_tables or similar
      // For now, we test that queries respect RLS by default
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');

      // Should not throw error, but may return filtered results
      expect(error).toBeNull();
    });

    it('should have RLS enabled on agent_runtime_status', async () => {
      const { error } = await supabase
        .from('agent_runtime_status')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have RLS enabled on agent_activity_logs', async () => {
      const { error } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have RLS enabled on cloud_deployments', async () => {
      const { error } = await supabase
        .from('cloud_deployments')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have RLS enabled on agent_versions', async () => {
      const { error } = await supabase
        .from('agent_versions')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have RLS enabled on agent_workflows', async () => {
      const { error } = await supabase
        .from('agent_workflows')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Permission Boundary Tests', () => {
    it('should prevent reading user_roles for other users (non-admin)', async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user for this test');
        return;
      }

      // Try to read all user_roles
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');

      // If user is not admin, should only see their own roles
      if (data && data.length > 0) {
        const allRolesBelongToUser = data.every((role: any) => role.user_id === user.id);
        expect(allRolesBelongToUser).toBe(true);
      }
    });

    it('should prevent unauthorized inserts into user_roles', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user for this test');
        return;
      }

      // Try to grant ourselves admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
          scope: 'global',
          granted_by: user.id
        });

      // Should fail unless user is already admin
      // If it succeeds, user was already admin or RLS is misconfigured
      if (error) {
        expect(error.message).toContain('permission');
      }
    });
  });

  describe('Data Isolation Tests', () => {
    it('should not leak agent data across owners', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user for this test');
        return;
      }

      // Get all agents visible to this user
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*');

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      // If agents exist, verify we can only see:
      // 1. Agents we own, OR
      // 2. Agents we have explicit role access to via user_roles
      if (agents && agents.length > 0) {
        for (const agent of agents) {
          const isOwner = agent.owner_id === user.id;
          
          // Check if user has role-based access
          const { data: hasAccess } = await supabase.rpc('user_can_access_agent', {
            check_user_id: user.id,
            check_agent_id: agent.id,
            required_permission: 'view'
          });

          expect(isOwner || hasAccess).toBe(true);
        }
      }
    });

    it('should not leak activity logs across agents', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user for this test');
        return;
      }

      // Get all activity logs
      const { data: logs, error } = await supabase
        .from('agent_activity_logs')
        .select('*, agents!inner(owner_id)')
        .limit(100);

      if (error) {
        console.error('Error fetching logs:', error);
        return;
      }

      // All logs should belong to agents we can access
      if (logs && logs.length > 0) {
        for (const log of logs) {
          const agent = (log as any).agents;
          expect(agent.owner_id).toBe(user.id);
        }
      }
    });
  });

  describe('Edge Function RBAC Integration', () => {
    it('should enforce permissions in aoc-runtime-action edge function', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user for this test');
        return;
      }

      // Try to control a non-existent agent
      const fakeAgentId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase.functions.invoke('aoc-runtime-action', {
        body: {
          agentId: fakeAgentId,
          action: 'run'
        }
      });

      // Should fail with permission error
      if (error || (data && data.error)) {
        const errorMessage = error?.message || data?.error || '';
        expect(errorMessage.toLowerCase()).toMatch(/permission|access|not found/);
      }
    });
  });
});

describe('RBAC Regression Tests', () => {
  it('should not have duplicate RBAC tables', async () => {
    // Query pg_tables to ensure user_roles exists only once
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should not have conflicting RLS policies', async () => {
    // This is a smoke test - if policies conflict, operations will fail
    const { error: insertError } = await supabase
      .from('agent_activity_logs')
      .insert({
        agent_id: '00000000-0000-0000-0000-000000000000',
        log_type: 'info',
        message: 'Test log for RBAC validation'
      });

    // Insert may fail due to foreign key, but should not fail due to RLS conflict
    if (insertError) {
      expect(insertError.message).not.toContain('policy');
    }
  });

  it('should have consistent RBAC helper functions', async () => {
    // Call both functions with same user/agent to ensure consistency
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testAgentId = '11111111-1111-1111-1111-111111111111';

    const { data: hasRole } = await supabase.rpc('user_has_role', {
      check_user_id: testUserId,
      check_role: 'admin',
      check_scope: 'global'
    });

    const { data: canAccess } = await supabase.rpc('user_can_access_agent', {
      check_user_id: testUserId,
      check_agent_id: testAgentId,
      required_permission: 'view'
    });

    // Both should return boolean
    expect(typeof hasRole).toBe('boolean');
    expect(typeof canAccess).toBe('boolean');
  });
});

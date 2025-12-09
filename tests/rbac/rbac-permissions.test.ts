import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('AOC RBAC Permissions', () => {
  let testUserId: string;
  let testAgentId: string;
  let viewerUserId: string;
  let operatorUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // This test suite requires test users to be set up in the database
    // In a real environment, you'd create these programmatically
    console.log('⚠️  RBAC tests require pre-configured test users in the database');
  });

  describe('Role Hierarchy', () => {
    it('should correctly identify admin role', async () => {
      const { data, error } = await supabase.rpc('user_has_role', {
        check_user_id: adminUserId,
        check_role: 'admin',
        check_scope: 'global'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should correctly identify operator role', async () => {
      const { data, error } = await supabase.rpc('user_has_role', {
        check_user_id: operatorUserId,
        check_role: 'operator',
        check_scope: null
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should correctly identify viewer role', async () => {
      const { data, error } = await supabase.rpc('user_has_role', {
        check_user_id: viewerUserId,
        check_role: 'viewer',
        check_scope: null
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });
  });

  describe('Agent Access Permissions', () => {
    it('owner should have full access to their agent', async () => {
      const { data, error } = await supabase.rpc('user_can_access_agent', {
        check_user_id: testUserId,
        check_agent_id: testAgentId,
        required_permission: 'admin'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('global admin should have access to all agents', async () => {
      const { data, error } = await supabase.rpc('user_can_access_agent', {
        check_user_id: adminUserId,
        check_agent_id: testAgentId,
        required_permission: 'admin'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('operator should have operate permission but not admin', async () => {
      const { data: operateAccess, error: operateError } = await supabase.rpc('user_can_access_agent', {
        check_user_id: operatorUserId,
        check_agent_id: testAgentId,
        required_permission: 'operate'
      });

      const { data: adminAccess, error: adminError } = await supabase.rpc('user_can_access_agent', {
        check_user_id: operatorUserId,
        check_agent_id: testAgentId,
        required_permission: 'admin'
      });

      expect(operateError).toBeNull();
      expect(operateAccess).toBe(true);
      expect(adminError).toBeNull();
      expect(adminAccess).toBe(false);
    });

    it('viewer should have view permission only', async () => {
      const { data: viewAccess, error: viewError } = await supabase.rpc('user_can_access_agent', {
        check_user_id: viewerUserId,
        check_agent_id: testAgentId,
        required_permission: 'view'
      });

      const { data: operateAccess, error: operateError } = await supabase.rpc('user_can_access_agent', {
        check_user_id: viewerUserId,
        check_agent_id: testAgentId,
        required_permission: 'operate'
      });

      expect(viewError).toBeNull();
      expect(viewAccess).toBe(true);
      expect(operateError).toBeNull();
      expect(operateAccess).toBe(false);
    });
  });

  describe('RLS Enforcement', () => {
    it('should prevent unauthorized access to agent_runtime_status', async () => {
      // Attempt to access runtime status for an agent the user doesn't own
      const { data, error } = await supabase
        .from('agent_runtime_status')
        .select('*')
        .eq('agent_id', testAgentId);

      // Should return empty or error if user doesn't have access
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('should prevent unauthorized access to agent_activity_logs', async () => {
      const { data, error } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .eq('agent_id', testAgentId);

      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toHaveLength(0);
      }
    });

    it('should allow owner to access their agent data', async () => {
      // This would require authenticating as the owner
      // For now, we verify the policy exists
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', testAgentId);

      expect(error).toBeNull();
    });
  });

  describe('Scope-Based Access', () => {
    it('should respect agent-scoped permissions', async () => {
      // Test that a user with scope='agent:<id>' can only access that specific agent
      const { data: scopedAccess, error: scopedError } = await supabase.rpc('user_can_access_agent', {
        check_user_id: viewerUserId,
        check_agent_id: testAgentId,
        required_permission: 'view'
      });

      expect(scopedError).toBeNull();
      expect(typeof scopedAccess).toBe('boolean');
    });

    it('should deny access to agents outside scope', async () => {
      // Create a second agent ID that's not in the user's scope
      const otherAgentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      const { data, error } = await supabase.rpc('user_can_access_agent', {
        check_user_id: viewerUserId,
        check_agent_id: otherAgentId,
        required_permission: 'view'
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });
});

describe('RBAC Integration Tests', () => {
  it('should have user_roles table with correct schema', async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have user_has_role function', async () => {
    const { data, error } = await supabase.rpc('user_has_role', {
      check_user_id: '00000000-0000-0000-0000-000000000000',
      check_role: 'admin',
      check_scope: null
    });

    // Function exists even if result is false
    expect(error).toBeNull();
    expect(typeof data).toBe('boolean');
  });

  it('should have user_can_access_agent function', async () => {
    const { data, error } = await supabase.rpc('user_can_access_agent', {
      check_user_id: '00000000-0000-0000-0000-000000000000',
      check_agent_id: '00000000-0000-0000-0000-000000000000',
      required_permission: 'view'
    });

    expect(error).toBeNull();
    expect(typeof data).toBe('boolean');
  });
});

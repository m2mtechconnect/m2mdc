-- ============================================
-- AOC RBAC Complete Setup Script
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Create RLS Policies for user_roles
-- ============================================

CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY user_roles_admin_manage ON public.user_roles
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND (ur.scope = 'global' OR ur.scope IS NULL)
    )
  );

-- Step 2: Create RLS Policies for agents
-- ============================================

CREATE POLICY agents_owner_full_access ON public.agents
  FOR ALL 
  USING (auth.uid() = owner_id);

CREATE POLICY agents_admin_view_all ON public.agents
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND (scope = 'global' OR scope IS NULL)
    )
  );

CREATE POLICY agents_operator_update ON public.agents
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('operator', 'admin')
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || agents.id::text)
    )
  );

CREATE POLICY agents_viewer_select ON public.agents
  FOR SELECT 
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('viewer', 'operator', 'admin')
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || agents.id::text)
    )
  );

-- Step 3: Enable RLS and create policies for agent_action_logs
-- ============================================

ALTER TABLE public.agent_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY action_logs_select_accessible ON public.agent_action_logs
  FOR SELECT 
  USING (
    system_id IN (
      SELECT id FROM public.agents WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('viewer', 'operator', 'admin')
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || agent_action_logs.system_id::text)
    )
  );

CREATE POLICY action_logs_system_insert ON public.agent_action_logs
  FOR INSERT 
  WITH CHECK (true);

-- Step 4: Enable RLS and create policies for agent_runs
-- ============================================

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_runs_select_accessible ON public.agent_runs
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR agent_id IN (
      SELECT id FROM public.agents WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('viewer', 'operator', 'admin')
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || agent_runs.agent_id::text)
    )
  );

CREATE POLICY agent_runs_insert_owned ON public.agent_runs
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid()
    AND agent_id IN (
      SELECT id FROM public.agents WHERE owner_id = auth.uid()
    )
  );

-- Step 5: Enable RLS and create policies for deployments
-- ============================================

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY deployments_select_accessible ON public.deployments
  FOR SELECT 
  USING (
    system_id IN (
      SELECT id FROM public.agents WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('viewer', 'operator', 'admin')
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || deployments.system_id::text)
    )
  );

CREATE POLICY deployments_insert_operators ON public.deployments
  FOR INSERT 
  WITH CHECK (
    system_id IN (
      SELECT id FROM public.agents WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('operator', 'admin')
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || system_id::text)
    )
  );

-- Step 6: Enable RLS and create policies for audit_logs
-- ============================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_view_all ON public.audit_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND (scope = 'global' OR scope IS NULL)
    )
  );

CREATE POLICY audit_logs_user_view_own ON public.audit_logs
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY audit_logs_system_insert ON public.audit_logs
  FOR INSERT 
  WITH CHECK (true);

-- Step 7: Create helper functions
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_role(
  check_user_id UUID,
  check_role TEXT,
  check_scope TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = check_role
      AND (check_scope IS NULL OR scope = check_scope OR scope = 'global' OR scope IS NULL)
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_agent(
  check_user_id UUID,
  check_agent_id UUID,
  required_permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents WHERE id = check_agent_id AND owner_id = check_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
      AND (
        (required_permission = 'view' AND role IN ('viewer', 'operator', 'admin'))
        OR (required_permission = 'operate' AND role IN ('operator', 'admin'))
        OR (required_permission = 'admin' AND role = 'admin')
      )
      AND (scope = 'global' OR scope IS NULL OR scope = 'agent:' || check_agent_id::text)
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Step 8: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON public.user_roles(scope);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON public.agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_system_id ON public.agent_action_logs(system_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON public.agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_deployments_system_id ON public.deployments(system_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- ============================================
-- Setup Complete!
-- ============================================

-- Next steps:
-- 1. Grant yourself admin role:
--    INSERT INTO public.user_roles (user_id, role, scope)
--    VALUES (auth.uid(), 'admin', 'global');
--
-- 2. Verify policies:
--    SELECT * FROM pg_policies WHERE tablename IN ('user_roles', 'agents', 'agent_action_logs', 'agent_runs', 'deployments', 'audit_logs');
--
-- 3. Test permissions with different roles

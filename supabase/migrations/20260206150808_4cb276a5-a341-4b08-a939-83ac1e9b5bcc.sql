-- ============================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- Fix Security Definer Views & Harden RLS
-- ============================================

-- ============================================
-- PART 1: Fix Security Definer Views
-- Convert views to use SECURITY INVOKER (default)
-- ============================================

-- Drop and recreate vw_mcp_servers with SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_mcp_servers;
CREATE VIEW public.vw_mcp_servers 
WITH (security_invoker = true)
AS
SELECT id,
    name,
    provider,
    category,
    auth_type,
    verified,
    tools_count,
    resources_count,
    prompts_count,
    optimized,
    logo_url,
    description,
    endpoint,
    is_active,
    created_at,
    updated_at
FROM mcp_servers_catalog
WHERE is_active = true;

-- Drop and recreate vw_templates_industry with SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_templates_industry;
CREATE VIEW public.vw_templates_industry 
WITH (security_invoker = true)
AS
SELECT id,
    name,
    description,
    industry,
    tags,
    roi_pct,
    rating,
    certified,
    downloads,
    hero_icon,
    thumbnail_url,
    sample_prompts,
    kpi_definitions,
    default_config,
    is_active,
    created_at,
    updated_at
FROM industry_templates
WHERE is_active = true;

-- Drop and recreate vw_templates_m2m with SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_templates_m2m;
CREATE VIEW public.vw_templates_m2m 
WITH (security_invoker = true)
AS
SELECT id,
    name,
    description,
    industry,
    tags,
    roi_pct,
    rating,
    downloads,
    certified,
    hero_icon,
    thumbnail_url,
    quick_actions,
    sample_prompts,
    kpi_definitions,
    default_config,
    is_active,
    created_at,
    updated_at
FROM m2m_templates
WHERE is_active = true;

-- Grant necessary permissions on views
GRANT SELECT ON public.vw_mcp_servers TO authenticated, anon;
GRANT SELECT ON public.vw_templates_industry TO authenticated, anon;
GRANT SELECT ON public.vw_templates_m2m TO authenticated, anon;

-- ============================================
-- PART 2: Harden RLS Policies
-- Replace USING(true) with proper auth checks
-- ============================================

-- Fix agent_action_logs: Require authenticated user
DROP POLICY IF EXISTS "Service can insert action logs" ON public.agent_action_logs;
CREATE POLICY "Authenticated users can insert action logs"
ON public.agent_action_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix agent_activity_logs: Link to user's agents
DROP POLICY IF EXISTS "activity_logs_insert" ON public.agent_activity_logs;
CREATE POLICY "Users can insert activity logs for their agents"
ON public.agent_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.id = agent_activity_logs.agent_id 
    AND agents.owner_id = auth.uid()
  )
);

-- Fix contact_expert_logs: Link to authenticated user
DROP POLICY IF EXISTS "Users can create contact logs" ON public.contact_expert_logs;
CREATE POLICY "Authenticated users can create contact logs"
ON public.contact_expert_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);
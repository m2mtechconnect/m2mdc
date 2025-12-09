CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'executive',
    'manager',
    'engineer',
    'security_admin'
);


--
-- Name: policy_decision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policy_decision AS ENUM (
    'allow',
    'deny',
    'warn'
);


--
-- Name: policy_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policy_scope AS ENUM (
    'model',
    'rag',
    'mcp',
    'workflow',
    'global'
);


--
-- Name: policy_target_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.policy_target_type AS ENUM (
    'model',
    'rag_source',
    'mcp_server',
    'workflow_node',
    'deployment'
);


--
-- Name: check_user_has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_has_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;


--
-- Name: cleanup_agent_suggestions_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_agent_suggestions_cache() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.agent_suggestions_cache
  WHERE expires_at < NOW();
END;
$$;


--
-- Name: cleanup_expired_oauth_states(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_oauth_states() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Delete states older than 1 hour (expired or used)
  DELETE FROM public.oauth_states
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (used = true AND used_at < NOW() - INTERVAL '1 hour');
END;
$$;


--
-- Name: cleanup_old_copilot_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_copilot_cache() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.copilot_sessions_cache
  WHERE last_accessed < NOW() - INTERVAL '30 days';
END;
$$;


--
-- Name: cleanup_old_copilot_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_copilot_events() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.copilot_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


--
-- Name: cleanup_old_copilot_memory(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_copilot_memory() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.copilot_memory
  WHERE updated_at < NOW() - INTERVAL '180 days';
END;
$$;


--
-- Name: dedupe_connector_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dedupe_connector_ids() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Deduplicate connector_ids array
  IF NEW.connector_ids IS NOT NULL THEN
    NEW.connector_ids := ARRAY(SELECT DISTINCT unnest(NEW.connector_ids));
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: delete_secret_from_vault(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_secret_from_vault(vault_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE id = vault_id::UUID;
END;
$$;


--
-- Name: generate_avatar_color(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_avatar_color(user_id_input uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  colors TEXT[] := ARRAY[
    '#F59E0B', -- amber-500 (yellow)
    '#8B5CF6', -- violet-500 (purple)
    '#3B82F6', -- blue-500
    '#10B981', -- emerald-500
    '#EF4444', -- red-500
    '#EC4899', -- pink-500
    '#14B8A6', -- teal-500
    '#F97316'  -- orange-500
  ];
  hash_value BIGINT;
  color_index INT;
BEGIN
  -- Generate hash from UUID and convert to positive integer
  hash_value := ABS(('x' || substring(user_id_input::text, 1, 8))::bit(32)::int);
  color_index := (hash_value % array_length(colors, 1)) + 1;
  RETURN colors[color_index];
END;
$$;


--
-- Name: generate_initials(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_initials(full_name_input text, email_input text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  name_parts TEXT[];
  initials TEXT := '';
BEGIN
  -- If no full name, use email
  IF full_name_input IS NULL OR full_name_input = '' THEN
    RETURN UPPER(SUBSTRING(email_input, 1, 1));
  END IF;
  
  -- Split name by spaces
  name_parts := string_to_array(trim(full_name_input), ' ');
  
  -- Get first letter of first name
  IF array_length(name_parts, 1) >= 1 THEN
    initials := UPPER(SUBSTRING(name_parts[1], 1, 1));
  END IF;
  
  -- Get first letter of last name if exists
  IF array_length(name_parts, 1) >= 2 THEN
    initials := initials || UPPER(SUBSTRING(name_parts[array_length(name_parts, 1)], 1, 1));
  END IF;
  
  RETURN initials;
END;
$$;


--
-- Name: get_secret_from_vault(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_secret_from_vault(vault_id text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = vault_id::UUID;
  
  RETURN secret_value;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get user email and name from metadata
  user_email := NEW.email;
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Insert profile with auto-generated avatar data
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    avatar_bg_color,
    avatar_initials
  )
  VALUES (
    NEW.id,
    user_email,
    user_name,
    generate_avatar_color(NEW.id),
    generate_initials(user_name, user_email)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    avatar_bg_color = COALESCE(profiles.avatar_bg_color, generate_avatar_color(NEW.id)),
    avatar_initials = COALESCE(profiles.avatar_initials, generate_initials(user_name, user_email));
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: link_system_integration(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_system_integration(p_system_id uuid, p_integration_id uuid, p_status text DEFAULT 'active'::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.system_integrations (system_id, integration_id, status, metadata)
  VALUES (p_system_id, p_integration_id, p_status, p_metadata)
  ON CONFLICT (system_id, integration_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    updated_at = now();
END;
$$;


--
-- Name: match_documents(public.vector, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT 5, filter_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT d.id, d.content, d.metadata,
         1 - (d.embedding <=> query_embedding) as similarity
  FROM public.rag_documents d
  WHERE (filter_user_id IS NULL OR d.user_id = filter_user_id)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;


--
-- Name: rpc_kpi_agents_deployed(timestamp with time zone, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_kpi_agents_deployed(p_from timestamp with time zone, p_to timestamp with time zone, p_org_id uuid DEFAULT NULL::uuid) RETURNS TABLE(active_count integer, delta_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_count INT;
  previous_count INT;
  period_duration INTERVAL;
BEGIN
  period_duration := p_to - p_from;
  
  -- Current period active count
  SELECT COUNT(*)
  INTO current_count
  FROM agents a
  WHERE a.status IN ('active', 'deployed', 'running')
    AND a.deployed_at <= p_to
    AND (p_org_id IS NULL OR a.org_id = p_org_id);
  
  -- Previous period active count
  SELECT COUNT(*)
  INTO previous_count
  FROM agents a
  WHERE a.status IN ('active', 'deployed', 'running')
    AND a.deployed_at <= (p_from - period_duration)
    AND (p_org_id IS NULL OR a.org_id = p_org_id);
  
  RETURN QUERY SELECT current_count, (current_count - previous_count);
END;
$$;


--
-- Name: rpc_kpi_compliance_accuracy(timestamp with time zone, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_kpi_compliance_accuracy(p_from timestamp with time zone, p_to timestamp with time zone, p_org_id uuid DEFAULT NULL::uuid) RETURNS TABLE(accuracy_pct numeric, delta_pct numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_accuracy numeric;
  previous_accuracy numeric;
  period_length interval;
  previous_from timestamptz;
  previous_to timestamptz;
BEGIN
  period_length := p_to - p_from;
  previous_from := p_from - period_length;
  previous_to := p_from;

  SELECT COALESCE(AVG(
    CASE 
      WHEN (ar.citations::text != '[]' AND ar.citations IS NOT NULL) THEN 100 
      ELSE 0 
    END
  ), 0)
  INTO current_accuracy
  FROM agent_runs ar
  JOIN agents a ON ar.agent_id = a.id
  WHERE ar.created_at BETWEEN p_from AND p_to
    AND ar.status = 'completed'
    AND (p_org_id IS NULL OR a.org_id = p_org_id);

  SELECT COALESCE(AVG(
    CASE 
      WHEN (ar.citations::text != '[]' AND ar.citations IS NOT NULL) THEN 100 
      ELSE 0 
    END
  ), 0)
  INTO previous_accuracy
  FROM agent_runs ar
  JOIN agents a ON ar.agent_id = a.id
  WHERE ar.created_at BETWEEN previous_from AND previous_to
    AND ar.status = 'completed'
    AND (p_org_id IS NULL OR a.org_id = p_org_id);

  RETURN QUERY SELECT 
    current_accuracy,
    (current_accuracy - previous_accuracy) as delta_pct;
END;
$$;


--
-- Name: rpc_kpi_roi_growth(timestamp with time zone, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_kpi_roi_growth(p_from timestamp with time zone, p_to timestamp with time zone, p_org_id uuid DEFAULT NULL::uuid) RETURNS TABLE(roi_pct numeric, delta_pct numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_roi NUMERIC;
  previous_roi NUMERIC;
  period_duration INTERVAL;
BEGIN
  period_duration := p_to - p_from;
  
  -- Current period ROI
  SELECT COALESCE(AVG(r.roi_pct), 0)
  INTO current_roi
  FROM roi_snapshots r
  JOIN agents a ON a.id = r.system_id
  WHERE r.created_at >= p_from AND r.created_at <= p_to
    AND (p_org_id IS NULL OR a.org_id = p_org_id);
  
  -- Previous period ROI
  SELECT COALESCE(AVG(r.roi_pct), 0)
  INTO previous_roi
  FROM roi_snapshots r
  JOIN agents a ON a.id = r.system_id
  WHERE r.created_at >= (p_from - period_duration) AND r.created_at < p_from
    AND (p_org_id IS NULL OR a.org_id = p_org_id);
  
  RETURN QUERY SELECT current_roi, (current_roi - previous_roi);
END;
$$;


--
-- Name: rpc_kpi_time_saved(timestamp with time zone, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_kpi_time_saved(p_from timestamp with time zone, p_to timestamp with time zone, p_org_id uuid DEFAULT NULL::uuid) RETURNS TABLE(hours numeric, delta_hours numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_hours NUMERIC;
  previous_hours NUMERIC;
  period_duration INTERVAL;
BEGIN
  period_duration := p_to - p_from;
  
  -- Current period time saved
  SELECT COALESCE(SUM(r.time_saved_week), 0)
  INTO current_hours
  FROM roi_snapshots r
  JOIN agents a ON a.id = r.system_id
  WHERE r.created_at >= p_from AND r.created_at <= p_to
    AND (p_org_id IS NULL OR a.org_id = p_org_id);
  
  -- Previous period time saved
  SELECT COALESCE(SUM(r.time_saved_week), 0)
  INTO previous_hours
  FROM roi_snapshots r
  JOIN agents a ON a.id = r.system_id
  WHERE r.created_at >= (p_from - period_duration) AND r.created_at < p_from
    AND (p_org_id IS NULL OR a.org_id = p_org_id);
  
  RETURN QUERY SELECT current_hours, (current_hours - previous_hours);
END;
$$;


--
-- Name: store_secret_in_vault(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.store_secret_in_vault(secret_name text, secret_value text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
DECLARE
  vault_id TEXT;
BEGIN
  -- Insert secret into Vault
  INSERT INTO vault.secrets (name, secret)
  VALUES (secret_name, secret_value)
  RETURNING id INTO vault_id;
  
  RETURN vault_id;
END;
$$;


--
-- Name: unlink_system_integration(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlink_system_integration(p_system_id uuid, p_integration_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.system_integrations
  WHERE system_id = p_system_id AND integration_id = p_integration_id;
END;
$$;


--
-- Name: update_document_analysis_jobs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_document_analysis_jobs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_industry_agents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_industry_agents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_integrations_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_integrations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_policies_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_policies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_secret_in_vault(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_secret_in_vault(vault_id text, new_secret_value text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret_value,
      updated_at = NOW()
  WHERE id = vault_id::UUID;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_website_cache_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_website_cache_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: user_can_access_agent(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_can_access_agent(check_user_id uuid, check_agent_id uuid, required_permission text DEFAULT 'view'::text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = check_agent_id AND owner_id = check_user_id
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


--
-- Name: user_has_role(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_role(check_user_id uuid, check_role text, check_scope text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = check_role
      AND (check_scope IS NULL OR scope = check_scope OR scope = 'global' OR scope IS NULL)
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;


--
-- Name: validate_system_prompt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_system_prompt() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.default_config->>'system_prompt' IS NULL OR LENGTH(NEW.default_config->>'system_prompt') < 10 THEN
    RAISE EXCEPTION 'system_prompt required (min 10 chars)';
  END IF;
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: agent_action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_action_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid,
    system_id uuid,
    connection_id uuid,
    action_key text NOT NULL,
    action_params jsonb,
    status text NOT NULL,
    error_message text,
    response jsonb,
    trace_id text,
    created_at timestamp with time zone DEFAULT now(),
    duration_ms integer,
    CONSTRAINT agent_action_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'pending'::text])))
);


--
-- Name: agent_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    log_type text NOT NULL,
    message text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    run_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.agent_activity_logs REPLICA IDENTITY FULL;


--
-- Name: agent_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_custom_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_custom_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agent_id uuid,
    question_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    site_id uuid,
    idempotency_key text,
    status text DEFAULT 'DRAFT'::text,
    step_completed integer DEFAULT 2,
    goal jsonb,
    template_ref text,
    config jsonb,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_environments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    export_type text NOT NULL,
    file_path text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agent_exports_export_type_check CHECK ((export_type = ANY (ARRAY['pdf'::text, 'csv'::text, 'json'::text, 'excel'::text]))),
    CONSTRAINT agent_exports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: agent_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    version_id text,
    provider text DEFAULT 'zapier'::text NOT NULL,
    connection_id uuid,
    capabilities jsonb DEFAULT '{"actions": [], "triggers": []}'::jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory (
    agent_id text NOT NULL,
    user_id uuid NOT NULL,
    state jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agent_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    input jsonb,
    output jsonb,
    duration_ms integer,
    error text,
    citations jsonb DEFAULT '[]'::jsonb,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT agent_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: agent_runtime_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runtime_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    status text DEFAULT 'stopped'::text NOT NULL,
    environment text DEFAULT 'dev'::text NOT NULL,
    current_version text DEFAULT '1.0.0'::text NOT NULL,
    last_action text,
    last_action_at timestamp with time zone,
    health_status text DEFAULT 'healthy'::text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_suggestions_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_suggestions_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash text NOT NULL,
    query text NOT NULL,
    chips text[] DEFAULT '{}'::text[],
    suggestions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    hit_count integer DEFAULT 1
);


--
-- Name: agent_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    icon text NOT NULL,
    default_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    recommended_models jsonb DEFAULT '[]'::jsonb,
    sample_prompts jsonb DEFAULT '[]'::jsonb,
    kpi_definitions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    slug text
);


--
-- Name: agent_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    version text NOT NULL,
    commit_message text,
    config_snapshot jsonb NOT NULL,
    deployed_to_env text[],
    published_by uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now(),
    is_rollback boolean DEFAULT false,
    parent_version_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: agent_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    name text NOT NULL,
    workflow_json jsonb NOT NULL,
    enabled boolean DEFAULT true,
    trigger_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    version text DEFAULT 'v1'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    template_id text,
    config jsonb DEFAULT '{}'::jsonb,
    owner_id uuid NOT NULL,
    org_id uuid,
    success_rate numeric(5,2) DEFAULT 0,
    total_runs integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deployed_at timestamp with time zone,
    environment_id uuid,
    last_heartbeat timestamp with time zone,
    model_id text,
    connector_ids text[] DEFAULT ARRAY[]::text[],
    workflow_graph_id uuid,
    CONSTRAINT agents_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text])))
);


--
-- Name: ai_recommendations_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_recommendations_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    site_url text,
    site_hash text,
    recommendations jsonb NOT NULL,
    model_version text DEFAULT 'google/gemini-2.5-flash'::text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval)
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: capture_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capture_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key text NOT NULL,
    domain text NOT NULL,
    url text NOT NULL,
    result jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: captured_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.captured_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    content_hash text NOT NULL,
    title text,
    content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cloud_deployments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cloud_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    environment_id uuid,
    provider text NOT NULL,
    region text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    instance_id text,
    compute_tier text,
    resources jsonb DEFAULT '{}'::jsonb,
    endpoints jsonb DEFAULT '{}'::jsonb,
    cost_estimate numeric(10,2),
    deployed_at timestamp with time zone,
    stopped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_expert_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_expert_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    status text DEFAULT 'pending'::text,
    CONSTRAINT contact_expert_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'contacted'::text, 'resolved'::text])))
);


--
-- Name: content_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid,
    chunk_index integer NOT NULL,
    chunk_text text NOT NULL,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: copilot_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    agent_id uuid,
    session_id text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    prompt text NOT NULL,
    response_summary text,
    action_clicked text,
    latency_ms integer,
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: copilot_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: copilot_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id uuid NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    last_query text,
    response_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval)
);


--
-- Name: copilot_sessions_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_sessions_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    source text NOT NULL,
    confidence numeric(3,2) DEFAULT 0,
    citations jsonb DEFAULT '[]'::jsonb,
    hit_count integer DEFAULT 1,
    last_accessed timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crawl_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crawl_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    depth integer DEFAULT 0,
    max_depth integer DEFAULT 1,
    retries integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    robots_allowed boolean,
    pages_crawled integer DEFAULT 0,
    bytes_fetched bigint DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT crawl_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'dead-letter'::text])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: deployment_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    deployed_by uuid NOT NULL,
    deployed_at timestamp with time zone DEFAULT now() NOT NULL,
    roi_estimate jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    accuracy_estimate numeric,
    model_id text,
    tool_count integer DEFAULT 0,
    connector_count integer DEFAULT 0
);


--
-- Name: deployments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    version text DEFAULT 'v1'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    region text DEFAULT 'northamerica-northeast1'::text NOT NULL,
    model text,
    grounding boolean DEFAULT false,
    runtime_url text,
    health text DEFAULT 'unknown'::text,
    error_message text,
    deployed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT deployments_health_check CHECK ((health = ANY (ARRAY['unknown'::text, 'OK'::text, 'degraded'::text, 'down'::text]))),
    CONSTRAINT deployments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'publishing'::text, 'active'::text, 'failed'::text, 'stopped'::text])))
);


--
-- Name: digital_twin_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.digital_twin_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    twin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_id text,
    run_id text,
    status text DEFAULT 'running'::text NOT NULL,
    logs jsonb DEFAULT '[]'::jsonb,
    state_changes jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: digital_twins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.digital_twins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT digital_twins_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


--
-- Name: document_analysis_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_analysis_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    file_name text NOT NULL,
    file_type text,
    status text DEFAULT 'queued'::text NOT NULL,
    progress integer DEFAULT 0,
    progress_message text,
    result jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    raw_text text,
    char_count integer,
    page_count integer,
    extraction_method text,
    truncated boolean DEFAULT false,
    model_used text,
    stage text DEFAULT 'queued'::text
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid,
    title text NOT NULL,
    source_type text NOT NULL,
    source_url text,
    content text,
    summary text,
    status text DEFAULT 'processing'::text NOT NULL,
    vector_indexed boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT documents_source_type_check CHECK ((source_type = ANY (ARRAY['file'::text, 'url'::text, 'text'::text]))),
    CONSTRAINT documents_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'indexed'::text, 'failed'::text])))
);


--
-- Name: environments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT environments_name_check CHECK ((name = ANY (ARRAY['production'::text, 'staging'::text, 'development'::text])))
);


--
-- Name: funding_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funding_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_name text NOT NULL,
    agency text NOT NULL,
    jurisdiction text NOT NULL,
    province text,
    url text NOT NULL,
    focus_areas text[] DEFAULT '{}'::text[],
    funding_type text[] DEFAULT '{}'::text[],
    funding_amount_min bigint,
    funding_amount_max bigint,
    status text DEFAULT 'Unknown'::text,
    eligibility_summary text,
    description text,
    last_scraped_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT funding_programs_jurisdiction_check CHECK ((jurisdiction = ANY (ARRAY['Federal'::text, 'Provincial'::text, 'Regional'::text, 'Municipal'::text]))),
    CONSTRAINT funding_programs_status_check CHECK ((status = ANY (ARRAY['Open'::text, 'Closed'::text, 'Upcoming'::text, 'Continuous'::text, 'Unknown'::text])))
);


--
-- Name: heartbeats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.heartbeats (
    id bigint NOT NULL,
    system_id uuid,
    beat_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: heartbeats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.heartbeats ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.heartbeats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: indexed_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indexed_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type text NOT NULL,
    source_name text NOT NULL,
    url text,
    title text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    indexed_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT indexed_content_source_type_check CHECK ((source_type = ANY (ARRAY['doc'::text, 'web'::text, 'app'::text, 'drive'::text, 'sharepoint'::text, 'zapier'::text])))
);


--
-- Name: industry_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text,
    integration_type text NOT NULL,
    status text DEFAULT 'Not Connected'::text,
    last_run_at timestamp with time zone,
    industry text NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    logo_url text,
    agent_type text DEFAULT 'industry'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    build_steps jsonb,
    workflow_diagram_url text,
    io_schema jsonb,
    model_stack jsonb,
    performance jsonb,
    evaluations jsonb,
    required_secrets text[],
    dependencies text[],
    compliance_notes text,
    changelog jsonb,
    version text,
    thumbnail_url text,
    short_description text,
    CONSTRAINT industry_agents_agent_type_check CHECK ((agent_type = 'industry'::text)),
    CONSTRAINT industry_agents_category_check CHECK ((category = ANY (ARRAY['CRM'::text, 'ERP'::text, 'Cloud'::text, 'ITSM'::text, 'Analytics'::text, 'Communication'::text, 'Storage'::text, 'RAG'::text, 'Search'::text, 'Support'::text, 'IoT'::text, 'Compliance'::text, 'Operations'::text]))),
    CONSTRAINT industry_agents_integration_type_check CHECK ((integration_type = ANY (ARRAY['Zapier'::text, 'API'::text, 'Native'::text]))),
    CONSTRAINT industry_agents_status_check CHECK ((status = ANY (ARRAY['Connected'::text, 'Not Connected'::text])))
);


--
-- Name: industry_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    industry text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    roi_pct integer,
    rating numeric(2,1),
    certified boolean DEFAULT true,
    downloads integer DEFAULT 0,
    hero_icon text,
    thumbnail_url text,
    sample_prompts jsonb DEFAULT '[]'::jsonb,
    kpi_definitions jsonb DEFAULT '[]'::jsonb,
    default_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: integration_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid,
    action text NOT NULL,
    status text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    error_message text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT integration_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'pending'::text])))
);


--
-- Name: integration_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    app_id text NOT NULL,
    sync_type text NOT NULL,
    status text NOT NULL,
    records_synced integer DEFAULT 0,
    error_message text,
    duration_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid,
    name text NOT NULL,
    provider text NOT NULL,
    category text,
    status text DEFAULT 'disconnected'::text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    credentials jsonb,
    last_sync timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    state text,
    connect_method text,
    credentials_encrypted text,
    last_run timestamp with time zone,
    last_test_result jsonb,
    error_message text,
    created_by uuid,
    vault_credentials_id text,
    CONSTRAINT integrations_connect_method_check CHECK ((connect_method = ANY (ARRAY['oauth'::text, 'apikey'::text, 'zapier'::text]))),
    CONSTRAINT integrations_state_check CHECK ((state = ANY (ARRAY['connected'::text, 'not-connected'::text, 'error'::text, 'auth-expired'::text]))),
    CONSTRAINT integrations_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'disconnected'::text, 'error'::text])))
);


--
-- Name: integrations_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    user_id uuid NOT NULL,
    provider text DEFAULT 'zapier'::text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone,
    display_name text,
    scopes text,
    status text DEFAULT 'connected'::text NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    vault_access_token_id text,
    vault_refresh_token_id text,
    CONSTRAINT integrations_connections_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'expired'::text, 'error'::text])))
);


--
-- Name: integrations_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    app_id text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_type text DEFAULT 'Bearer'::text,
    expires_at timestamp with time zone,
    scope text,
    status text DEFAULT 'active'::text,
    last_sync_at timestamp with time zone,
    sync_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    vault_access_token_id text,
    vault_refresh_token_id text
);


--
-- Name: intelligence_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intelligence_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    model_id text,
    rag_config jsonb DEFAULT '{}'::jsonb,
    mcp_servers jsonb DEFAULT '[]'::jsonb,
    tool_allowlist text[] DEFAULT ARRAY[]::text[],
    version text DEFAULT 'v1'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    arcade_registry boolean DEFAULT true,
    arcade_server_id text
);


--
-- Name: knowledge_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid,
    name text NOT NULL,
    description text,
    tags text[] DEFAULT ARRAY[]::text[],
    embedding_model text DEFAULT 'text-embedding-004'::text,
    indexed_at timestamp with time zone,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: m2m_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m2m_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    industry text,
    tags text[] DEFAULT '{}'::text[],
    roi_pct integer,
    rating numeric(2,1),
    downloads integer DEFAULT 0,
    certified boolean DEFAULT true,
    hero_icon text,
    thumbnail_url text,
    quick_actions jsonb DEFAULT '[]'::jsonb,
    sample_prompts jsonb DEFAULT '[]'::jsonb,
    kpi_definitions jsonb DEFAULT '[]'::jsonb,
    default_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    server_id text NOT NULL,
    auth_type text NOT NULL,
    access_token text,
    refresh_token text,
    token_expires_at timestamp with time zone,
    api_key text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vault_access_token_id text,
    vault_refresh_token_id text,
    vault_api_key_id text,
    CONSTRAINT mcp_credentials_auth_type_check CHECK ((auth_type = ANY (ARRAY['oauth2'::text, 'api_key'::text, 'bearer'::text, 'custom'::text])))
);


--
-- Name: mcp_servers_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_servers_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    category text NOT NULL,
    auth_type text NOT NULL,
    verified boolean DEFAULT false,
    tools_count integer DEFAULT 0,
    resources_count integer DEFAULT 0,
    prompts_count integer DEFAULT 0,
    optimized boolean DEFAULT false,
    logo_url text,
    description text,
    endpoint text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    logo_cdn_url text,
    last_remote_update timestamp with time zone,
    status text DEFAULT 'active'::text,
    raw jsonb,
    CONSTRAINT mcp_servers_catalog_status_check CHECK ((status = ANY (ARRAY['active'::text, 'beta'::text, 'deprecated'::text])))
);


--
-- Name: mcp_sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_sync_runs (
    id bigint NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    added integer DEFAULT 0 NOT NULL,
    updated integer DEFAULT 0 NOT NULL,
    removed integer DEFAULT 0 NOT NULL,
    error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT mcp_sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'partial'::text, 'failed'::text])))
);


--
-- Name: mcp_sync_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mcp_sync_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mcp_sync_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mcp_sync_runs_id_seq OWNED BY public.mcp_sync_runs.id;


--
-- Name: mcp_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    system_id uuid NOT NULL,
    server_name text NOT NULL,
    token bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_health (
    id bigint NOT NULL,
    system_id uuid,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    uptime_pct numeric,
    errors_24h integer DEFAULT 0,
    latency_ms numeric,
    throughput_rpm integer,
    cpu_load_pct numeric,
    mem_load_pct numeric
);


--
-- Name: mv_ops_overview; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_ops_overview AS
 SELECT now() AS as_of,
    count(DISTINCT s.id) FILTER (WHERE (s.status = ANY (ARRAY['active'::text, 'deployed'::text, 'running'::text]))) AS active_systems,
    COALESCE(avg(h.uptime_pct), (0)::numeric) AS uptime_pct,
    COALESCE(sum(h.errors_24h), (0)::bigint) AS errors_24h,
    COALESCE(avg(h.latency_ms), (0)::numeric) AS avg_latency_ms,
    COALESCE(sum(h.throughput_rpm), (0)::bigint) AS total_rpm
   FROM (public.agents s
     LEFT JOIN LATERAL ( SELECT sh.id,
            sh.system_id,
            sh.observed_at,
            sh.uptime_pct,
            sh.errors_24h,
            sh.latency_ms,
            sh.throughput_rpm,
            sh.cpu_load_pct,
            sh.mem_load_pct
           FROM public.system_health sh
          WHERE (sh.system_id = s.id)
          ORDER BY sh.observed_at DESC
         LIMIT 1) h ON (true))
  WITH NO DATA;


--
-- Name: oauth_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_token text NOT NULL,
    user_id uuid NOT NULL,
    system_id uuid,
    app_id text NOT NULL,
    provider text DEFAULT 'zapier'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    used_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    domain text,
    industry text,
    default_role text DEFAULT 'engineer'::text,
    mfa_enabled boolean DEFAULT false,
    sso_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: page_classifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_classifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    industry text NOT NULL,
    department text NOT NULL,
    content_type text NOT NULL,
    data_signals text[] DEFAULT ARRAY[]::text[],
    pii_risk text NOT NULL,
    confidence numeric(3,2),
    candidate_use_cases text[] DEFAULT ARRAY[]::text[],
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT page_classifications_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT page_classifications_pii_risk_check CHECK ((pii_risk = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])))
);


--
-- Name: page_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    summary text NOT NULL,
    bullets text[] DEFAULT ARRAY[]::text[],
    source text NOT NULL,
    grounding_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT page_summaries_source_check CHECK ((source = ANY (ARRAY['gemini'::text, 'vertex'::text])))
);


--
-- Name: policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    scope public.policy_scope NOT NULL,
    rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true,
    version integer DEFAULT 1,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: policy_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    policy_id uuid,
    action text NOT NULL,
    target text,
    decision public.policy_decision NOT NULL,
    reason text,
    latency_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    ts timestamp with time zone DEFAULT now()
);


--
-- Name: policy_bindings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_bindings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id uuid,
    target_type public.policy_target_type NOT NULL,
    target_id text NOT NULL,
    priority integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    org_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    job_title text,
    phone text,
    locale text DEFAULT 'en'::text,
    timezone text DEFAULT 'UTC'::text,
    department_id uuid,
    avatar_bg_color text,
    avatar_initials text
);


--
-- Name: rag_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    system_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    chunk_text text NOT NULL,
    page_number integer,
    embedding public.vector(1536),
    hash text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rag_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    source text NOT NULL,
    uri text,
    size_bytes bigint,
    pages integer,
    status text DEFAULT 'queued'::text NOT NULL,
    residency text DEFAULT 'ca-northamerica-northeast1'::text NOT NULL,
    options jsonb DEFAULT '{}'::jsonb,
    last_indexed timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rag_items_source_check CHECK ((source = ANY (ARRAY['upload'::text, 'url'::text, 'gdrive'::text, 'sharepoint'::text, 's3'::text, 'db'::text]))),
    CONSTRAINT rag_items_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'parsing'::text, 'embedding'::text, 'indexed'::text, 'failed'::text])))
);


--
-- Name: rag_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    token_encrypted bytea NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rag_tokens_provider_check CHECK ((provider = ANY (ARRAY['gdrive'::text, 'sharepoint'::text, 'onedrive'::text, 's3'::text])))
);


--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid,
    departments_covered jsonb DEFAULT '[]'::jsonb,
    payload jsonb NOT NULL,
    topn integer DEFAULT 3,
    model text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roi_assumptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roi_assumptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    time_saved_per_run_min integer DEFAULT 30 NOT NULL,
    runs_per_week integer DEFAULT 40 NOT NULL,
    loaded_cost_per_hour integer DEFAULT 75 NOT NULL,
    accuracy_improvement_pct integer DEFAULT 35 NOT NULL,
    cost_per_error integer DEFAULT 500 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: roi_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roi_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    roi_pct numeric NOT NULL,
    annual_savings numeric NOT NULL,
    time_saved_week numeric NOT NULL,
    error_savings_year numeric DEFAULT 0 NOT NULL,
    assumptions_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: scraper_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scraper_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_name text NOT NULL,
    status text NOT NULL,
    programs_found integer DEFAULT 0,
    programs_inserted integer DEFAULT 0,
    programs_updated integer DEFAULT 0,
    programs_skipped integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT scraper_logs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text, 'partial'::text])))
);


--
-- Name: search_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_searches integer DEFAULT 0,
    url_captures integer DEFAULT 0,
    query_answers integer DEFAULT 0,
    avg_latency_ms double precision,
    grounding_coverage_pct double precision,
    robots_blocked_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    query text NOT NULL,
    intent text,
    normalized_url text,
    result_count integer DEFAULT 0,
    latency_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT search_history_intent_check CHECK ((intent = ANY (ARRAY['URL'::text, 'QUERY'::text])))
);


--
-- Name: site_crawls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_crawls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid,
    started_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone,
    page_count integer DEFAULT 0,
    sitemap_used boolean DEFAULT false,
    error text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid,
    url text NOT NULL,
    status_code integer,
    content_text text,
    content_html text,
    lang text,
    word_count integer,
    crawled_at timestamp with time zone DEFAULT now()
);


--
-- Name: sites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    company_name text,
    industry_guess text,
    last_crawled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sovereign_dc_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sovereign_dc_facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    region text NOT NULL,
    description text,
    energy_mix jsonb DEFAULT '{"renewable": 0.5, "naturalGas": 0.5}'::jsonb NOT NULL,
    financial_profile jsonb DEFAULT '{}'::jsonb NOT NULL,
    base_kpis jsonb DEFAULT '{}'::jsonb NOT NULL,
    cooling_zones jsonb DEFAULT '[]'::jsonb,
    gpu_clusters jsonb DEFAULT '[]'::jsonb,
    data_flows jsonb DEFAULT '[]'::jsonb,
    incident_scenarios jsonb DEFAULT '[]'::jsonb,
    carbon_scenarios jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sovereign_dc_simulation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sovereign_dc_simulation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    name text,
    input_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    results_summary text NOT NULL,
    kpi_deltas jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_ms integer,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_builder_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_builder_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid,
    step integer NOT NULL,
    state jsonb DEFAULT '{}'::jsonb NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_builder_state_step_check CHECK (((step >= 1) AND (step <= 6)))
);


--
-- Name: system_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_events (
    id bigint NOT NULL,
    system_id uuid,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    severity text,
    message text,
    CONSTRAINT system_events_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text])))
);


--
-- Name: system_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.system_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.system_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: system_health_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.system_health ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.system_health_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: system_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    role text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_integrations_role_check CHECK ((role = ANY (ARRAY['source'::text, 'destination'::text, 'notification'::text])))
);


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role public.app_role NOT NULL,
    invited_by uuid NOT NULL,
    org_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    scope text,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'operator'::text, 'viewer'::text, 'owner'::text])))
);


--
-- Name: vw_mcp_servers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_mcp_servers AS
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
   FROM public.mcp_servers_catalog
  WHERE (is_active = true);


--
-- Name: vw_templates_industry; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_templates_industry AS
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
   FROM public.industry_templates
  WHERE (is_active = true);


--
-- Name: vw_templates_m2m; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_templates_m2m AS
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
   FROM public.m2m_templates
  WHERE (is_active = true);


--
-- Name: website_content_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_content_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    url text NOT NULL,
    content text,
    word_count integer DEFAULT 0,
    chunk_hash text NOT NULL,
    extracted_at timestamp with time zone DEFAULT now(),
    summary jsonb DEFAULT '{}'::jsonb,
    version integer DEFAULT 1,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_edges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_edges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    from_node_id uuid NOT NULL,
    from_port text DEFAULT 'output'::text NOT NULL,
    to_node_id uuid NOT NULL,
    to_port text DEFAULT 'input'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    type text NOT NULL,
    x numeric DEFAULT 0 NOT NULL,
    y numeric DEFAULT 0 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflow_nodes_type_check CHECK ((type = ANY (ARRAY['analyze'::text, 'classify'::text, 'notify_teams'::text, 'create_ticket_jira'::text, 'write_salesforce'::text, 'generate_report'::text])))
);


--
-- Name: workflow_run_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_run_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    node_id uuid,
    stage text NOT NULL,
    ok boolean DEFAULT true NOT NULL,
    latency_ms integer,
    tokens_in integer,
    tokens_out integer,
    payload jsonb,
    error jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT workflow_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflows_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


--
-- Name: zapier_apps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zapier_apps (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category text[] DEFAULT '{}'::text[],
    status text DEFAULT 'active'::text,
    premium boolean DEFAULT false,
    logo_url text,
    connections_count integer DEFAULT 0,
    webhook_url text,
    auth_type text DEFAULT 'oauth2'::text,
    supports_triggers boolean DEFAULT true,
    supports_actions boolean DEFAULT true,
    pricing_tier text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_synced_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_sync_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_sync_runs ALTER COLUMN id SET DEFAULT nextval('public.mcp_sync_runs_id_seq'::regclass);


--
-- Name: agent_action_logs agent_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_action_logs
    ADD CONSTRAINT agent_action_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_activity_logs agent_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activity_logs
    ADD CONSTRAINT agent_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_conversations agent_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_pkey PRIMARY KEY (id);


--
-- Name: agent_custom_questions agent_custom_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_custom_questions
    ADD CONSTRAINT agent_custom_questions_pkey PRIMARY KEY (id);


--
-- Name: agent_drafts agent_drafts_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_drafts
    ADD CONSTRAINT agent_drafts_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: agent_drafts agent_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_drafts
    ADD CONSTRAINT agent_drafts_pkey PRIMARY KEY (id);


--
-- Name: agent_environments agent_environments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_environments
    ADD CONSTRAINT agent_environments_name_key UNIQUE (name);


--
-- Name: agent_environments agent_environments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_environments
    ADD CONSTRAINT agent_environments_pkey PRIMARY KEY (id);


--
-- Name: agent_exports agent_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_exports
    ADD CONSTRAINT agent_exports_pkey PRIMARY KEY (id);


--
-- Name: agent_integrations agent_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_integrations
    ADD CONSTRAINT agent_integrations_pkey PRIMARY KEY (id);


--
-- Name: agent_memory agent_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory
    ADD CONSTRAINT agent_memory_pkey PRIMARY KEY (agent_id, user_id);


--
-- Name: agent_messages agent_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_runs agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);


--
-- Name: agent_runtime_status agent_runtime_status_agent_id_environment_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runtime_status
    ADD CONSTRAINT agent_runtime_status_agent_id_environment_key UNIQUE (agent_id, environment);


--
-- Name: agent_runtime_status agent_runtime_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runtime_status
    ADD CONSTRAINT agent_runtime_status_pkey PRIMARY KEY (id);


--
-- Name: agent_suggestions_cache agent_suggestions_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_suggestions_cache
    ADD CONSTRAINT agent_suggestions_cache_pkey PRIMARY KEY (id);


--
-- Name: agent_suggestions_cache agent_suggestions_cache_query_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_suggestions_cache
    ADD CONSTRAINT agent_suggestions_cache_query_hash_key UNIQUE (query_hash);


--
-- Name: agent_templates agent_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_templates
    ADD CONSTRAINT agent_templates_pkey PRIMARY KEY (id);


--
-- Name: agent_versions agent_versions_agent_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions
    ADD CONSTRAINT agent_versions_agent_id_version_key UNIQUE (agent_id, version);


--
-- Name: agent_versions agent_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions
    ADD CONSTRAINT agent_versions_pkey PRIMARY KEY (id);


--
-- Name: agent_workflows agent_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT agent_workflows_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: ai_recommendations_cache ai_recommendations_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_recommendations_cache
    ADD CONSTRAINT ai_recommendations_cache_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: capture_cache capture_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capture_cache
    ADD CONSTRAINT capture_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: capture_cache capture_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capture_cache
    ADD CONSTRAINT capture_cache_pkey PRIMARY KEY (id);


--
-- Name: captured_pages captured_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captured_pages
    ADD CONSTRAINT captured_pages_pkey PRIMARY KEY (id);


--
-- Name: captured_pages captured_pages_url_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captured_pages
    ADD CONSTRAINT captured_pages_url_content_hash_key UNIQUE (url, content_hash);


--
-- Name: cloud_deployments cloud_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_deployments
    ADD CONSTRAINT cloud_deployments_pkey PRIMARY KEY (id);


--
-- Name: contact_expert_logs contact_expert_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_expert_logs
    ADD CONSTRAINT contact_expert_logs_pkey PRIMARY KEY (id);


--
-- Name: content_embeddings content_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_pkey PRIMARY KEY (id);


--
-- Name: copilot_events copilot_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_events
    ADD CONSTRAINT copilot_events_pkey PRIMARY KEY (id);


--
-- Name: copilot_memory copilot_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_memory
    ADD CONSTRAINT copilot_memory_pkey PRIMARY KEY (id);


--
-- Name: copilot_memory copilot_memory_user_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_memory
    ADD CONSTRAINT copilot_memory_user_id_key_key UNIQUE (user_id, key);


--
-- Name: copilot_sessions_cache copilot_sessions_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_sessions_cache
    ADD CONSTRAINT copilot_sessions_cache_pkey PRIMARY KEY (id);


--
-- Name: copilot_sessions_cache copilot_sessions_cache_user_id_query_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_sessions_cache
    ADD CONSTRAINT copilot_sessions_cache_user_id_query_key UNIQUE (user_id, query);


--
-- Name: copilot_sessions copilot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_sessions
    ADD CONSTRAINT copilot_sessions_pkey PRIMARY KEY (id);


--
-- Name: crawl_jobs crawl_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crawl_jobs
    ADD CONSTRAINT crawl_jobs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: deployment_tracking deployment_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_tracking
    ADD CONSTRAINT deployment_tracking_pkey PRIMARY KEY (id);


--
-- Name: deployments deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (id);


--
-- Name: digital_twin_runs digital_twin_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_twin_runs
    ADD CONSTRAINT digital_twin_runs_pkey PRIMARY KEY (id);


--
-- Name: digital_twins digital_twins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_twins
    ADD CONSTRAINT digital_twins_pkey PRIMARY KEY (id);


--
-- Name: digital_twins digital_twins_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_twins
    ADD CONSTRAINT digital_twins_slug_key UNIQUE (slug);


--
-- Name: document_analysis_jobs document_analysis_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_analysis_jobs
    ADD CONSTRAINT document_analysis_jobs_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: environments environments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_name_key UNIQUE (name);


--
-- Name: environments environments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_pkey PRIMARY KEY (id);


--
-- Name: funding_programs funding_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funding_programs
    ADD CONSTRAINT funding_programs_pkey PRIMARY KEY (id);


--
-- Name: funding_programs funding_programs_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funding_programs
    ADD CONSTRAINT funding_programs_url_key UNIQUE (url);


--
-- Name: heartbeats heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heartbeats
    ADD CONSTRAINT heartbeats_pkey PRIMARY KEY (id);


--
-- Name: indexed_content indexed_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indexed_content
    ADD CONSTRAINT indexed_content_pkey PRIMARY KEY (id);


--
-- Name: industry_agents industry_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_agents
    ADD CONSTRAINT industry_agents_pkey PRIMARY KEY (id);


--
-- Name: industry_templates industry_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_pkey PRIMARY KEY (id);


--
-- Name: integration_logs integration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (id);


--
-- Name: integration_sync_logs integration_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_sync_logs
    ADD CONSTRAINT integration_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: integrations_connections integrations_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations_connections
    ADD CONSTRAINT integrations_connections_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: integrations_tokens integrations_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations_tokens
    ADD CONSTRAINT integrations_tokens_pkey PRIMARY KEY (id);


--
-- Name: intelligence_settings intelligence_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_settings
    ADD CONSTRAINT intelligence_settings_pkey PRIMARY KEY (id);


--
-- Name: intelligence_settings intelligence_settings_system_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_settings
    ADD CONSTRAINT intelligence_settings_system_id_key UNIQUE (system_id);


--
-- Name: knowledge_sources knowledge_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_sources
    ADD CONSTRAINT knowledge_sources_pkey PRIMARY KEY (id);


--
-- Name: m2m_templates m2m_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_templates
    ADD CONSTRAINT m2m_templates_pkey PRIMARY KEY (id);


--
-- Name: mcp_credentials mcp_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_credentials
    ADD CONSTRAINT mcp_credentials_pkey PRIMARY KEY (id);


--
-- Name: mcp_credentials mcp_credentials_user_id_server_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_credentials
    ADD CONSTRAINT mcp_credentials_user_id_server_id_key UNIQUE (user_id, server_id);


--
-- Name: mcp_servers_catalog mcp_servers_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_servers_catalog
    ADD CONSTRAINT mcp_servers_catalog_pkey PRIMARY KEY (id);


--
-- Name: mcp_sync_runs mcp_sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_sync_runs
    ADD CONSTRAINT mcp_sync_runs_pkey PRIMARY KEY (id);


--
-- Name: mcp_tokens mcp_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_tokens
    ADD CONSTRAINT mcp_tokens_pkey PRIMARY KEY (id);


--
-- Name: mcp_tokens mcp_tokens_system_id_server_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_tokens
    ADD CONSTRAINT mcp_tokens_system_id_server_name_key UNIQUE (system_id, server_name);


--
-- Name: oauth_states oauth_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_states oauth_states_state_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_states
    ADD CONSTRAINT oauth_states_state_token_key UNIQUE (state_token);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: page_classifications page_classifications_page_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_classifications
    ADD CONSTRAINT page_classifications_page_id_key UNIQUE (page_id);


--
-- Name: page_classifications page_classifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_classifications
    ADD CONSTRAINT page_classifications_pkey PRIMARY KEY (id);


--
-- Name: page_summaries page_summaries_page_id_source_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_summaries
    ADD CONSTRAINT page_summaries_page_id_source_key UNIQUE (page_id, source);


--
-- Name: page_summaries page_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_summaries
    ADD CONSTRAINT page_summaries_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: policy_audit policy_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_audit
    ADD CONSTRAINT policy_audit_pkey PRIMARY KEY (id);


--
-- Name: policy_bindings policy_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_bindings
    ADD CONSTRAINT policy_bindings_pkey PRIMARY KEY (id);


--
-- Name: policy_bindings policy_bindings_policy_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_bindings
    ADD CONSTRAINT policy_bindings_policy_id_target_type_target_id_key UNIQUE (policy_id, target_type, target_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: rag_chunks rag_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chunks
    ADD CONSTRAINT rag_chunks_pkey PRIMARY KEY (id);


--
-- Name: rag_documents rag_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_documents
    ADD CONSTRAINT rag_documents_pkey PRIMARY KEY (id);


--
-- Name: rag_items rag_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_items
    ADD CONSTRAINT rag_items_pkey PRIMARY KEY (id);


--
-- Name: rag_tokens rag_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_tokens
    ADD CONSTRAINT rag_tokens_pkey PRIMARY KEY (id);


--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);


--
-- Name: roi_assumptions roi_assumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_assumptions
    ADD CONSTRAINT roi_assumptions_pkey PRIMARY KEY (id);


--
-- Name: roi_assumptions roi_assumptions_system_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_assumptions
    ADD CONSTRAINT roi_assumptions_system_id_key UNIQUE (system_id);


--
-- Name: roi_snapshots roi_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_snapshots
    ADD CONSTRAINT roi_snapshots_pkey PRIMARY KEY (id);


--
-- Name: scraper_logs scraper_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraper_logs
    ADD CONSTRAINT scraper_logs_pkey PRIMARY KEY (id);


--
-- Name: search_analytics search_analytics_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_date_key UNIQUE (date);


--
-- Name: search_analytics search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: site_crawls site_crawls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_crawls
    ADD CONSTRAINT site_crawls_pkey PRIMARY KEY (id);


--
-- Name: site_pages site_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_pages
    ADD CONSTRAINT site_pages_pkey PRIMARY KEY (id);


--
-- Name: site_pages site_pages_site_id_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_pages
    ADD CONSTRAINT site_pages_site_id_url_key UNIQUE (site_id, url);


--
-- Name: sites sites_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_domain_key UNIQUE (domain);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: sovereign_dc_facilities sovereign_dc_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_dc_facilities
    ADD CONSTRAINT sovereign_dc_facilities_pkey PRIMARY KEY (id);


--
-- Name: sovereign_dc_simulation_runs sovereign_dc_simulation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_dc_simulation_runs
    ADD CONSTRAINT sovereign_dc_simulation_runs_pkey PRIMARY KEY (id);


--
-- Name: system_builder_state system_builder_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_builder_state
    ADD CONSTRAINT system_builder_state_pkey PRIMARY KEY (id);


--
-- Name: system_builder_state system_builder_state_system_id_step_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_builder_state
    ADD CONSTRAINT system_builder_state_system_id_step_key UNIQUE (system_id, step);


--
-- Name: system_events system_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_pkey PRIMARY KEY (id);


--
-- Name: system_health system_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health
    ADD CONSTRAINT system_health_pkey PRIMARY KEY (id);


--
-- Name: system_integrations system_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integrations
    ADD CONSTRAINT system_integrations_pkey PRIMARY KEY (id);


--
-- Name: system_integrations system_integrations_system_id_integration_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integrations
    ADD CONSTRAINT system_integrations_system_id_integration_id_key UNIQUE (system_id, integration_id);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_token_key UNIQUE (token);


--
-- Name: website_content_cache unique_domain_url_hash; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_content_cache
    ADD CONSTRAINT unique_domain_url_hash UNIQUE (domain, url, chunk_hash);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_scope_key UNIQUE (user_id, role, scope);


--
-- Name: website_content_cache website_content_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_content_cache
    ADD CONSTRAINT website_content_cache_pkey PRIMARY KEY (id);


--
-- Name: workflow_edges workflow_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_edges
    ADD CONSTRAINT workflow_edges_pkey PRIMARY KEY (id);


--
-- Name: workflow_nodes workflow_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_nodes
    ADD CONSTRAINT workflow_nodes_pkey PRIMARY KEY (id);


--
-- Name: workflow_run_events workflow_run_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_run_events
    ADD CONSTRAINT workflow_run_events_pkey PRIMARY KEY (id);


--
-- Name: workflow_runs workflow_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: zapier_apps zapier_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_apps
    ADD CONSTRAINT zapier_apps_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_agent ON public.agent_activity_logs USING btree (agent_id);


--
-- Name: idx_activity_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created ON public.agent_activity_logs USING btree (created_at DESC);


--
-- Name: idx_agent_action_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_action_logs_created_at ON public.agent_action_logs USING btree (created_at DESC);


--
-- Name: idx_agent_action_logs_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_action_logs_run_id ON public.agent_action_logs USING btree (run_id);


--
-- Name: idx_agent_action_logs_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_action_logs_system_id ON public.agent_action_logs USING btree (system_id);


--
-- Name: idx_agent_conversations_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_agent_id ON public.agent_conversations USING btree (agent_id);


--
-- Name: idx_agent_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_user_id ON public.agent_conversations USING btree (user_id);


--
-- Name: idx_agent_custom_questions_user_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_custom_questions_user_agent ON public.agent_custom_questions USING btree (user_id, agent_id);


--
-- Name: idx_agent_drafts_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_drafts_idempotency_key ON public.agent_drafts USING btree (idempotency_key);


--
-- Name: idx_agent_drafts_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_drafts_owner_id ON public.agent_drafts USING btree (owner_id);


--
-- Name: idx_agent_exports_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_exports_agent_id ON public.agent_exports USING btree (agent_id);


--
-- Name: idx_agent_exports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_exports_user_id ON public.agent_exports USING btree (user_id);


--
-- Name: idx_agent_integrations_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_integrations_connection_id ON public.agent_integrations USING btree (connection_id);


--
-- Name: idx_agent_integrations_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_integrations_system_id ON public.agent_integrations USING btree (system_id);


--
-- Name: idx_agent_memory_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_memory_user ON public.agent_memory USING btree (user_id);


--
-- Name: idx_agent_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_messages_conversation_id ON public.agent_messages USING btree (conversation_id);


--
-- Name: idx_agent_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_messages_created_at ON public.agent_messages USING btree (created_at DESC);


--
-- Name: idx_agent_runs_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_runs_agent_id ON public.agent_runs USING btree (agent_id);


--
-- Name: idx_agent_runs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_runs_user ON public.agent_runs USING btree (user_id, created_at DESC);


--
-- Name: idx_agent_suggestions_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_suggestions_cache_expires ON public.agent_suggestions_cache USING btree (expires_at);


--
-- Name: idx_agent_suggestions_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_suggestions_cache_hash ON public.agent_suggestions_cache USING btree (query_hash);


--
-- Name: idx_agent_templates_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_agent_templates_slug ON public.agent_templates USING btree (slug);


--
-- Name: idx_agent_versions_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_versions_agent ON public.agent_versions USING btree (agent_id);


--
-- Name: idx_agent_workflows_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_workflows_agent ON public.agent_workflows USING btree (agent_id);


--
-- Name: idx_agents_connector_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_connector_ids ON public.agents USING gin (connector_ids);


--
-- Name: idx_agents_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_owner_id ON public.agents USING btree (owner_id);


--
-- Name: idx_agents_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_template_id ON public.agents USING btree (template_id);


--
-- Name: idx_ai_recommendations_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_expires ON public.ai_recommendations_cache USING btree (expires_at);


--
-- Name: idx_ai_recommendations_site_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_site_hash ON public.ai_recommendations_cache USING btree (site_hash);


--
-- Name: idx_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_capture_cache_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capture_cache_domain ON public.capture_cache USING btree (domain);


--
-- Name: idx_capture_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capture_cache_expires ON public.capture_cache USING btree (expires_at);


--
-- Name: idx_capture_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capture_cache_key ON public.capture_cache USING btree (cache_key);


--
-- Name: idx_captured_pages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captured_pages_created_at ON public.captured_pages USING btree (created_at DESC);


--
-- Name: idx_captured_pages_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captured_pages_url ON public.captured_pages USING btree (url);


--
-- Name: idx_captured_pages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captured_pages_user_id ON public.captured_pages USING btree (user_id);


--
-- Name: idx_cloud_deployments_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cloud_deployments_agent ON public.cloud_deployments USING btree (agent_id);


--
-- Name: idx_contact_expert_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_expert_logs_created_at ON public.contact_expert_logs USING btree (created_at DESC);


--
-- Name: idx_contact_expert_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_expert_logs_status ON public.contact_expert_logs USING btree (status);


--
-- Name: idx_content_embeddings_content_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_embeddings_content_id ON public.content_embeddings USING btree (content_id);


--
-- Name: idx_copilot_cache_last_accessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_cache_last_accessed ON public.copilot_sessions_cache USING btree (last_accessed);


--
-- Name: idx_copilot_cache_user_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_cache_user_query ON public.copilot_sessions_cache USING btree (user_id, query);


--
-- Name: idx_copilot_events_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_events_agent_id ON public.copilot_events USING btree (agent_id);


--
-- Name: idx_copilot_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_events_created_at ON public.copilot_events USING btree (created_at DESC);


--
-- Name: idx_copilot_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_events_session_id ON public.copilot_events USING btree (session_id);


--
-- Name: idx_copilot_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_events_user_id ON public.copilot_events USING btree (user_id);


--
-- Name: idx_copilot_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_sessions_expires_at ON public.copilot_sessions USING btree (expires_at);


--
-- Name: idx_copilot_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_sessions_session_id ON public.copilot_sessions USING btree (session_id);


--
-- Name: idx_copilot_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_sessions_user_id ON public.copilot_sessions USING btree (user_id);


--
-- Name: idx_crawl_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crawl_jobs_created_at ON public.crawl_jobs USING btree (created_at DESC);


--
-- Name: idx_crawl_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crawl_jobs_status ON public.crawl_jobs USING btree (status);


--
-- Name: idx_deployment_tracking_deployed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deployment_tracking_deployed_by ON public.deployment_tracking USING btree (deployed_by);


--
-- Name: idx_deployment_tracking_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deployment_tracking_system_id ON public.deployment_tracking USING btree (system_id);


--
-- Name: idx_deployments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deployments_status ON public.deployments USING btree (status);


--
-- Name: idx_deployments_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deployments_system_id ON public.deployments USING btree (system_id);


--
-- Name: idx_digital_twin_runs_twin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_twin_runs_twin_id ON public.digital_twin_runs USING btree (twin_id);


--
-- Name: idx_digital_twin_runs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_twin_runs_user_id ON public.digital_twin_runs USING btree (user_id);


--
-- Name: idx_digital_twins_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_twins_slug ON public.digital_twins USING btree (slug);


--
-- Name: idx_digital_twins_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_twins_status ON public.digital_twins USING btree (status);


--
-- Name: idx_digital_twins_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_twins_user_id ON public.digital_twins USING btree (user_id);


--
-- Name: idx_document_analysis_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_analysis_jobs_status ON public.document_analysis_jobs USING btree (status);


--
-- Name: idx_document_analysis_jobs_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_analysis_jobs_status_created ON public.document_analysis_jobs USING btree (status, created_at) WHERE (status = 'queued'::text);


--
-- Name: idx_document_analysis_jobs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_analysis_jobs_user_id ON public.document_analysis_jobs USING btree (user_id);


--
-- Name: idx_funding_focus_areas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_focus_areas ON public.funding_programs USING gin (focus_areas);


--
-- Name: idx_funding_jurisdiction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_jurisdiction ON public.funding_programs USING btree (jurisdiction);


--
-- Name: idx_funding_province; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_province ON public.funding_programs USING btree (province);


--
-- Name: idx_funding_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_status ON public.funding_programs USING btree (status);


--
-- Name: idx_funding_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_type ON public.funding_programs USING gin (funding_type);


--
-- Name: idx_funding_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_url ON public.funding_programs USING btree (url);


--
-- Name: idx_heartbeats_system_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_heartbeats_system_time ON public.heartbeats USING btree (system_id, beat_at DESC);


--
-- Name: idx_indexed_content_indexed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indexed_content_indexed_at ON public.indexed_content USING btree (indexed_at DESC);


--
-- Name: idx_indexed_content_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indexed_content_source_type ON public.indexed_content USING btree (source_type);


--
-- Name: idx_indexed_content_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indexed_content_url ON public.indexed_content USING btree (url);


--
-- Name: idx_indexed_content_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indexed_content_user_id ON public.indexed_content USING btree (user_id);


--
-- Name: idx_industry_agents_agent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_agents_agent_type ON public.industry_agents USING btree (agent_type);


--
-- Name: idx_industry_agents_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_agents_industry ON public.industry_agents USING btree (industry);


--
-- Name: idx_industry_agents_integration_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_agents_integration_type ON public.industry_agents USING btree (integration_type);


--
-- Name: idx_industry_agents_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_agents_name_lower ON public.industry_agents USING btree (lower(name));


--
-- Name: idx_industry_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_agents_status ON public.industry_agents USING btree (status);


--
-- Name: idx_industry_templates_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_industry ON public.industry_templates USING btree (industry);


--
-- Name: idx_industry_templates_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_tags ON public.industry_templates USING gin (tags);


--
-- Name: idx_industry_templates_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_updated ON public.industry_templates USING btree (updated_at);


--
-- Name: idx_integration_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_created_at ON public.integration_logs USING btree (created_at DESC);


--
-- Name: idx_integration_logs_integration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_integration_id ON public.integration_logs USING btree (integration_id);


--
-- Name: idx_integration_sync_logs_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_sync_logs_app_id ON public.integration_sync_logs USING btree (app_id);


--
-- Name: idx_integration_sync_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_sync_logs_user_id ON public.integration_sync_logs USING btree (user_id);


--
-- Name: idx_integrations_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_category ON public.integrations USING btree (category);


--
-- Name: idx_integrations_connections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_connections_status ON public.integrations_connections USING btree (status);


--
-- Name: idx_integrations_connections_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_connections_user_id ON public.integrations_connections USING btree (user_id);


--
-- Name: idx_integrations_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_provider ON public.integrations USING btree (provider);


--
-- Name: idx_integrations_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_state ON public.integrations USING btree (state);


--
-- Name: idx_integrations_tokens_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_tokens_app_id ON public.integrations_tokens USING btree (app_id);


--
-- Name: idx_integrations_tokens_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_tokens_status ON public.integrations_tokens USING btree (status);


--
-- Name: idx_integrations_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_tokens_user_id ON public.integrations_tokens USING btree (user_id);


--
-- Name: idx_intelligence_settings_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intelligence_settings_system_id ON public.intelligence_settings USING btree (system_id);


--
-- Name: idx_knowledge_sources_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_sources_tags ON public.knowledge_sources USING gin (tags);


--
-- Name: idx_knowledge_sources_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_sources_user_id ON public.knowledge_sources USING btree (user_id);


--
-- Name: idx_m2m_templates_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_templates_industry ON public.m2m_templates USING btree (industry);


--
-- Name: idx_m2m_templates_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_templates_tags ON public.m2m_templates USING gin (tags);


--
-- Name: idx_m2m_templates_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_templates_updated ON public.m2m_templates USING btree (updated_at);


--
-- Name: idx_mcp_servers_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_servers_category ON public.mcp_servers_catalog USING btree (category);


--
-- Name: idx_mcp_servers_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_servers_provider ON public.mcp_servers_catalog USING btree (provider);


--
-- Name: idx_mcp_servers_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_servers_updated ON public.mcp_servers_catalog USING btree (updated_at);


--
-- Name: idx_mcp_sync_runs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_sync_runs_started ON public.mcp_sync_runs USING btree (started_at DESC);


--
-- Name: idx_mcp_tokens_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_tokens_system_id ON public.mcp_tokens USING btree (system_id);


--
-- Name: idx_mcp_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_tokens_user_id ON public.mcp_tokens USING btree (user_id);


--
-- Name: idx_oauth_states_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_states_expires ON public.oauth_states USING btree (expires_at) WHERE (used = false);


--
-- Name: idx_oauth_states_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_states_token ON public.oauth_states USING btree (state_token) WHERE (used = false);


--
-- Name: idx_policies_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policies_scope ON public.policies USING btree (scope);


--
-- Name: idx_policies_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policies_system_id ON public.policies USING btree (system_id);


--
-- Name: idx_policy_audit_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policy_audit_decision ON public.policy_audit USING btree (decision);


--
-- Name: idx_policy_audit_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policy_audit_system_id ON public.policy_audit USING btree (system_id);


--
-- Name: idx_policy_audit_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policy_audit_ts ON public.policy_audit USING btree (ts DESC);


--
-- Name: idx_policy_bindings_policy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policy_bindings_policy_id ON public.policy_bindings USING btree (policy_id);


--
-- Name: idx_policy_bindings_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policy_bindings_target ON public.policy_bindings USING btree (target_type, target_id);


--
-- Name: idx_rag_chunks_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_chunks_item_id ON public.rag_chunks USING btree (item_id);


--
-- Name: idx_rag_chunks_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_chunks_system_id ON public.rag_chunks USING btree (system_id);


--
-- Name: idx_rag_documents_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_documents_embedding ON public.rag_documents USING ivfflat (embedding public.vector_cosine_ops);


--
-- Name: idx_rag_documents_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_documents_user ON public.rag_documents USING btree (user_id);


--
-- Name: idx_rag_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_items_status ON public.rag_items USING btree (status);


--
-- Name: idx_rag_items_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_items_system_id ON public.rag_items USING btree (system_id);


--
-- Name: idx_recommendations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendations_created_at ON public.recommendations USING btree (created_at DESC);


--
-- Name: idx_recommendations_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendations_site_id ON public.recommendations USING btree (site_id);


--
-- Name: idx_roi_assumptions_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roi_assumptions_system_id ON public.roi_assumptions USING btree (system_id);


--
-- Name: idx_roi_snapshots_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roi_snapshots_system_id ON public.roi_snapshots USING btree (system_id);


--
-- Name: idx_runtime_status_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_runtime_status_agent ON public.agent_runtime_status USING btree (agent_id);


--
-- Name: idx_search_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_created_at ON public.search_history USING btree (created_at DESC);


--
-- Name: idx_search_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_user_id ON public.search_history USING btree (user_id);


--
-- Name: idx_site_pages_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_pages_site_id ON public.site_pages USING btree (site_id);


--
-- Name: idx_site_pages_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_pages_url ON public.site_pages USING btree (url);


--
-- Name: idx_sites_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sites_domain ON public.sites USING btree (domain);


--
-- Name: idx_system_builder_state_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_builder_state_step ON public.system_builder_state USING btree (step);


--
-- Name: idx_system_builder_state_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_builder_state_system_id ON public.system_builder_state USING btree (system_id);


--
-- Name: idx_system_events_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_events_system ON public.system_events USING btree (system_id, occurred_at DESC);


--
-- Name: idx_system_events_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_events_time ON public.system_events USING btree (occurred_at DESC);


--
-- Name: idx_system_health_system_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_health_system_time ON public.system_health USING btree (system_id, observed_at DESC);


--
-- Name: idx_system_integrations_integration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_integrations_integration_id ON public.system_integrations USING btree (integration_id);


--
-- Name: idx_system_integrations_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_integrations_system_id ON public.system_integrations USING btree (system_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_scope ON public.user_roles USING btree (scope);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_website_cache_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_cache_domain ON public.website_content_cache USING btree (domain);


--
-- Name: idx_website_cache_extracted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_cache_extracted_at ON public.website_content_cache USING btree (extracted_at DESC);


--
-- Name: idx_website_cache_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_cache_url ON public.website_content_cache USING btree (url);


--
-- Name: idx_workflow_edges_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_edges_workflow_id ON public.workflow_edges USING btree (workflow_id);


--
-- Name: idx_workflow_nodes_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_nodes_workflow_id ON public.workflow_nodes USING btree (workflow_id);


--
-- Name: idx_workflow_run_events_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_run_events_run_id ON public.workflow_run_events USING btree (run_id);


--
-- Name: idx_workflow_runs_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_runs_workflow_id ON public.workflow_runs USING btree (workflow_id);


--
-- Name: idx_workflows_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_created_by ON public.workflows USING btree (created_by);


--
-- Name: idx_workflows_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_system_id ON public.workflows USING btree (system_id);


--
-- Name: idx_zapier_apps_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zapier_apps_category ON public.zapier_apps USING gin (category);


--
-- Name: idx_zapier_apps_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zapier_apps_name ON public.zapier_apps USING btree (name);


--
-- Name: idx_zapier_apps_premium; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zapier_apps_premium ON public.zapier_apps USING btree (premium);


--
-- Name: idx_zapier_apps_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zapier_apps_status ON public.zapier_apps USING btree (status);


--
-- Name: agents dedupe_connector_ids_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dedupe_connector_ids_trigger BEFORE INSERT OR UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.dedupe_connector_ids();


--
-- Name: agent_conversations update_agent_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_integrations update_agent_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_integrations_updated_at BEFORE UPDATE ON public.agent_integrations FOR EACH ROW EXECUTE FUNCTION public.update_integrations_updated_at();


--
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: captured_pages update_captured_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_captured_pages_updated_at BEFORE UPDATE ON public.captured_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cloud_deployments update_cloud_deployments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cloud_deployments_updated_at BEFORE UPDATE ON public.cloud_deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: copilot_memory update_copilot_memory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_copilot_memory_updated_at BEFORE UPDATE ON public.copilot_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: copilot_sessions update_copilot_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_copilot_sessions_updated_at BEFORE UPDATE ON public.copilot_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deployment_tracking update_deployment_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deployment_tracking_updated_at BEFORE UPDATE ON public.deployment_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deployments update_deployments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON public.deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: digital_twins update_digital_twins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_digital_twins_updated_at BEFORE UPDATE ON public.digital_twins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: document_analysis_jobs update_document_analysis_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_document_analysis_jobs_updated_at BEFORE UPDATE ON public.document_analysis_jobs FOR EACH ROW EXECUTE FUNCTION public.update_document_analysis_jobs_updated_at();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: industry_agents update_industry_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_agents_updated_at BEFORE UPDATE ON public.industry_agents FOR EACH ROW EXECUTE FUNCTION public.update_industry_agents_updated_at();


--
-- Name: integrations_connections update_integrations_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integrations_connections_updated_at BEFORE UPDATE ON public.integrations_connections FOR EACH ROW EXECUTE FUNCTION public.update_integrations_updated_at();


--
-- Name: integrations_tokens update_integrations_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integrations_tokens_updated_at BEFORE UPDATE ON public.integrations_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integrations update_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: intelligence_settings update_intelligence_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_intelligence_settings_updated_at BEFORE UPDATE ON public.intelligence_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: knowledge_sources update_knowledge_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_knowledge_sources_updated_at BEFORE UPDATE ON public.knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: policies update_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_policies_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rag_items update_rag_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rag_items_updated_at BEFORE UPDATE ON public.rag_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rag_tokens update_rag_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rag_tokens_updated_at BEFORE UPDATE ON public.rag_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roi_assumptions update_roi_assumptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roi_assumptions_updated_at BEFORE UPDATE ON public.roi_assumptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_runtime_status update_runtime_status_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_runtime_status_updated_at BEFORE UPDATE ON public.agent_runtime_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sovereign_dc_facilities update_sovereign_dc_facilities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sovereign_dc_facilities_updated_at BEFORE UPDATE ON public.sovereign_dc_facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_builder_state update_system_builder_state_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_builder_state_updated_at BEFORE UPDATE ON public.system_builder_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: website_content_cache update_website_cache_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_website_cache_updated_at BEFORE UPDATE ON public.website_content_cache FOR EACH ROW EXECUTE FUNCTION public.update_website_cache_timestamp();


--
-- Name: workflow_nodes update_workflow_nodes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_nodes_updated_at BEFORE UPDATE ON public.workflow_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_workflows update_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.agent_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflows update_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: zapier_apps update_zapier_apps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_zapier_apps_updated_at BEFORE UPDATE ON public.zapier_apps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_templates validate_agent_template_prompt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_agent_template_prompt BEFORE INSERT OR UPDATE ON public.agent_templates FOR EACH ROW EXECUTE FUNCTION public.validate_system_prompt();


--
-- Name: agent_action_logs agent_action_logs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_action_logs
    ADD CONSTRAINT agent_action_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integrations_connections(id) ON DELETE SET NULL;


--
-- Name: agent_action_logs agent_action_logs_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_action_logs
    ADD CONSTRAINT agent_action_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.agent_runs(id) ON DELETE CASCADE;


--
-- Name: agent_action_logs agent_action_logs_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_action_logs
    ADD CONSTRAINT agent_action_logs_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_activity_logs agent_activity_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activity_logs
    ADD CONSTRAINT agent_activity_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_activity_logs agent_activity_logs_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_activity_logs
    ADD CONSTRAINT agent_activity_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.agent_runs(id);


--
-- Name: agent_conversations agent_conversations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_conversations agent_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agent_custom_questions agent_custom_questions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_custom_questions
    ADD CONSTRAINT agent_custom_questions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_custom_questions agent_custom_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_custom_questions
    ADD CONSTRAINT agent_custom_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agent_drafts agent_drafts_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_drafts
    ADD CONSTRAINT agent_drafts_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: agent_exports agent_exports_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_exports
    ADD CONSTRAINT agent_exports_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_exports agent_exports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_exports
    ADD CONSTRAINT agent_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agent_integrations agent_integrations_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_integrations
    ADD CONSTRAINT agent_integrations_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.integrations_connections(id) ON DELETE CASCADE;


--
-- Name: agent_integrations agent_integrations_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_integrations
    ADD CONSTRAINT agent_integrations_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_memory agent_memory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory
    ADD CONSTRAINT agent_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agent_messages agent_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.agent_conversations(id) ON DELETE CASCADE;


--
-- Name: agent_runs agent_runs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_runs agent_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: agent_runtime_status agent_runtime_status_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runtime_status
    ADD CONSTRAINT agent_runtime_status_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_versions agent_versions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions
    ADD CONSTRAINT agent_versions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_versions agent_versions_parent_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions
    ADD CONSTRAINT agent_versions_parent_version_id_fkey FOREIGN KEY (parent_version_id) REFERENCES public.agent_versions(id);


--
-- Name: agent_workflows agent_workflows_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT agent_workflows_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents agents_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id);


--
-- Name: agents agents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: captured_pages captured_pages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captured_pages
    ADD CONSTRAINT captured_pages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cloud_deployments cloud_deployments_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_deployments
    ADD CONSTRAINT cloud_deployments_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: cloud_deployments cloud_deployments_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_deployments
    ADD CONSTRAINT cloud_deployments_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.agent_environments(id);


--
-- Name: contact_expert_logs contact_expert_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_expert_logs
    ADD CONSTRAINT contact_expert_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: content_embeddings content_embeddings_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.indexed_content(id) ON DELETE CASCADE;


--
-- Name: copilot_events copilot_events_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_events
    ADD CONSTRAINT copilot_events_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: copilot_events copilot_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_events
    ADD CONSTRAINT copilot_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: copilot_sessions_cache copilot_sessions_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_sessions_cache
    ADD CONSTRAINT copilot_sessions_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: copilot_sessions copilot_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_sessions
    ADD CONSTRAINT copilot_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: deployment_tracking deployment_tracking_deployed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_tracking
    ADD CONSTRAINT deployment_tracking_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES auth.users(id);


--
-- Name: deployment_tracking deployment_tracking_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_tracking
    ADD CONSTRAINT deployment_tracking_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: digital_twin_runs digital_twin_runs_twin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_twin_runs
    ADD CONSTRAINT digital_twin_runs_twin_id_fkey FOREIGN KEY (twin_id) REFERENCES public.digital_twins(id) ON DELETE CASCADE;


--
-- Name: document_analysis_jobs document_analysis_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_analysis_jobs
    ADD CONSTRAINT document_analysis_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: heartbeats heartbeats_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heartbeats
    ADD CONSTRAINT heartbeats_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: indexed_content indexed_content_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indexed_content
    ADD CONSTRAINT indexed_content_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: integration_logs integration_logs_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;


--
-- Name: integration_logs integration_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: integrations integrations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: integrations_tokens integrations_tokens_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations_tokens
    ADD CONSTRAINT integrations_tokens_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.zapier_apps(id) ON DELETE CASCADE;


--
-- Name: integrations integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: intelligence_settings intelligence_settings_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_settings
    ADD CONSTRAINT intelligence_settings_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: knowledge_sources knowledge_sources_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_sources
    ADD CONSTRAINT knowledge_sources_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.captured_pages(id) ON DELETE SET NULL;


--
-- Name: knowledge_sources knowledge_sources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_sources
    ADD CONSTRAINT knowledge_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mcp_credentials mcp_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_credentials
    ADD CONSTRAINT mcp_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mcp_tokens mcp_tokens_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_tokens
    ADD CONSTRAINT mcp_tokens_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: mcp_tokens mcp_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_tokens
    ADD CONSTRAINT mcp_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: page_classifications page_classifications_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_classifications
    ADD CONSTRAINT page_classifications_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.captured_pages(id) ON DELETE CASCADE;


--
-- Name: page_summaries page_summaries_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_summaries
    ADD CONSTRAINT page_summaries_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.captured_pages(id) ON DELETE CASCADE;


--
-- Name: policies policies_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: policy_audit policy_audit_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_audit
    ADD CONSTRAINT policy_audit_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE SET NULL;


--
-- Name: policy_audit policy_audit_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_audit
    ADD CONSTRAINT policy_audit_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: policy_bindings policy_bindings_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_bindings
    ADD CONSTRAINT policy_bindings_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rag_chunks rag_chunks_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chunks
    ADD CONSTRAINT rag_chunks_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.rag_items(id) ON DELETE CASCADE;


--
-- Name: rag_documents rag_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_documents
    ADD CONSTRAINT rag_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rag_items rag_items_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_items
    ADD CONSTRAINT rag_items_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: rag_tokens rag_tokens_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_tokens
    ADD CONSTRAINT rag_tokens_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: recommendations recommendations_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: site_crawls site_crawls_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_crawls
    ADD CONSTRAINT site_crawls_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: site_pages site_pages_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_pages
    ADD CONSTRAINT site_pages_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;


--
-- Name: sovereign_dc_simulation_runs sovereign_dc_simulation_runs_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_dc_simulation_runs
    ADD CONSTRAINT sovereign_dc_simulation_runs_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.sovereign_dc_facilities(id) ON DELETE CASCADE;


--
-- Name: system_builder_state system_builder_state_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_builder_state
    ADD CONSTRAINT system_builder_state_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: system_events system_events_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: system_health system_health_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health
    ADD CONSTRAINT system_health_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: system_integrations system_integrations_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integrations
    ADD CONSTRAINT system_integrations_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;


--
-- Name: system_integrations system_integrations_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integrations
    ADD CONSTRAINT system_integrations_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workflow_edges workflow_edges_from_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_edges
    ADD CONSTRAINT workflow_edges_from_node_id_fkey FOREIGN KEY (from_node_id) REFERENCES public.workflow_nodes(id) ON DELETE CASCADE;


--
-- Name: workflow_edges workflow_edges_to_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_edges
    ADD CONSTRAINT workflow_edges_to_node_id_fkey FOREIGN KEY (to_node_id) REFERENCES public.workflow_nodes(id) ON DELETE CASCADE;


--
-- Name: workflow_edges workflow_edges_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_edges
    ADD CONSTRAINT workflow_edges_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_nodes workflow_nodes_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_nodes
    ADD CONSTRAINT workflow_nodes_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_run_events workflow_run_events_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_run_events
    ADD CONSTRAINT workflow_run_events_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.workflow_nodes(id) ON DELETE SET NULL;


--
-- Name: workflow_run_events workflow_run_events_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_run_events
    ADD CONSTRAINT workflow_run_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.workflow_runs(id) ON DELETE CASCADE;


--
-- Name: workflow_runs workflow_runs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workflow_runs workflow_runs_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all roles" ON public.user_roles FOR DELETE USING (public.check_user_has_role(auth.uid(), 'admin'::text));


--
-- Name: user_roles Admins can update all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all roles" ON public.user_roles FOR UPDATE USING (public.check_user_has_role(auth.uid(), 'admin'::text));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.check_user_has_role(auth.uid(), 'admin'::text));


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: agent_suggestions_cache Allow anonymous read of valid cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous read of valid cache" ON public.agent_suggestions_cache FOR SELECT USING ((expires_at > now()));


--
-- Name: ai_recommendations_cache Anyone can read cached recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read cached recommendations" ON public.ai_recommendations_cache FOR SELECT USING (true);


--
-- Name: zapier_apps Anyone can view Zapier apps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view Zapier apps" ON public.zapier_apps FOR SELECT USING (true);


--
-- Name: m2m_templates Anyone can view active M2M templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active M2M templates" ON public.m2m_templates FOR SELECT USING ((is_active = true));


--
-- Name: mcp_servers_catalog Anyone can view active MCP servers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active MCP servers" ON public.mcp_servers_catalog FOR SELECT USING ((is_active = true));


--
-- Name: industry_templates Anyone can view active industry templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active industry templates" ON public.industry_templates FOR SELECT USING ((is_active = true));


--
-- Name: website_content_cache Anyone can view cached website content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view cached website content" ON public.website_content_cache FOR SELECT USING (true);


--
-- Name: crawl_jobs Anyone can view crawl jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view crawl jobs" ON public.crawl_jobs FOR SELECT USING (true);


--
-- Name: departments Anyone can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);


--
-- Name: content_embeddings Anyone can view embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view embeddings" ON public.content_embeddings FOR SELECT USING (true);


--
-- Name: environments Anyone can view environments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view environments" ON public.environments FOR SELECT USING (true);


--
-- Name: funding_programs Anyone can view funding programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view funding programs" ON public.funding_programs FOR SELECT USING (true);


--
-- Name: industry_agents Anyone can view industry agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view industry agents" ON public.industry_agents FOR SELECT USING (true);


--
-- Name: recommendations Anyone can view recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view recommendations" ON public.recommendations FOR SELECT USING (true);


--
-- Name: search_analytics Anyone can view search analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view search analytics" ON public.search_analytics FOR SELECT USING (true);


--
-- Name: site_crawls Anyone can view site crawls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view site crawls" ON public.site_crawls FOR SELECT USING (true);


--
-- Name: site_pages Anyone can view site pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view site pages" ON public.site_pages FOR SELECT USING (true);


--
-- Name: sites Anyone can view sites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sites" ON public.sites FOR SELECT USING (true);


--
-- Name: agent_templates Anyone can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view templates" ON public.agent_templates FOR SELECT TO authenticated USING (true);


--
-- Name: scraper_logs Authenticated users can view scraper logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view scraper logs" ON public.scraper_logs FOR SELECT USING (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


--
-- Name: integrations Executives can delete integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can delete integrations" ON public.integrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: integrations Executives can insert integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can insert integrations" ON public.integrations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: integrations Executives can update integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can update integrations" ON public.integrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: contact_expert_logs Executives can view all contact logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can view all contact logs" ON public.contact_expert_logs FOR SELECT USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: integrations Executives can view all integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can view all integrations" ON public.integrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: integration_logs Executives can view all logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can view all logs" ON public.integration_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: mcp_sync_runs Executives can view sync runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Executives can view sync runs" ON public.mcp_sync_runs FOR SELECT USING (public.has_role(auth.uid(), 'executive'::public.app_role));


--
-- Name: audit_logs Security admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Security admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'security_admin'::public.app_role));


--
-- Name: agent_action_logs Service can insert action logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert action logs" ON public.agent_action_logs FOR INSERT WITH CHECK (true);


--
-- Name: policy_audit Service role can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert audit logs" ON public.policy_audit FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: system_events Service role can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert events" ON public.system_events FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: system_health Service role can insert health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert health" ON public.system_health FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: heartbeats Service role can insert heartbeats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert heartbeats" ON public.heartbeats FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: copilot_memory Service role can manage all memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all memory" ON public.copilot_memory USING (true);


--
-- Name: search_analytics Service role can manage analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage analytics" ON public.search_analytics USING ((auth.role() = 'service_role'::text));


--
-- Name: ai_recommendations_cache Service role can manage cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cache" ON public.ai_recommendations_cache USING (true);


--
-- Name: website_content_cache Service role can manage cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cache" ON public.website_content_cache USING ((auth.role() = 'service_role'::text));


--
-- Name: rag_chunks Service role can manage chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage chunks" ON public.rag_chunks USING ((auth.role() = 'service_role'::text));


--
-- Name: crawl_jobs Service role can manage crawl jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage crawl jobs" ON public.crawl_jobs USING ((auth.role() = 'service_role'::text));


--
-- Name: content_embeddings Service role can manage embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage embeddings" ON public.content_embeddings USING ((auth.role() = 'service_role'::text));


--
-- Name: funding_programs Service role can manage funding programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage funding programs" ON public.funding_programs USING ((auth.role() = 'service_role'::text));


--
-- Name: indexed_content Service role can manage indexed content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage indexed content" ON public.indexed_content USING ((auth.role() = 'service_role'::text));


--
-- Name: oauth_states Service role can manage oauth states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage oauth states" ON public.oauth_states TO service_role USING (true) WITH CHECK (true);


--
-- Name: recommendations Service role can manage recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage recommendations" ON public.recommendations USING ((auth.role() = 'service_role'::text));


--
-- Name: scraper_logs Service role can manage scraper logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage scraper logs" ON public.scraper_logs USING ((auth.role() = 'service_role'::text));


--
-- Name: site_crawls Service role can manage site crawls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage site crawls" ON public.site_crawls USING ((auth.role() = 'service_role'::text));


--
-- Name: site_pages Service role can manage site pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage site pages" ON public.site_pages USING ((auth.role() = 'service_role'::text));


--
-- Name: sites Service role can manage sites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage sites" ON public.sites USING ((auth.role() = 'service_role'::text));


--
-- Name: capture_cache Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.capture_cache USING (true);


--
-- Name: roi_snapshots Users can create ROI snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create ROI snapshots" ON public.roi_snapshots FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT workflows.created_by
   FROM public.workflows
  WHERE (workflows.system_id = roi_snapshots.system_id))));


--
-- Name: agents Users can create agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create agents" ON public.agents FOR INSERT WITH CHECK ((auth.uid() = owner_id));


--
-- Name: policy_bindings Users can create bindings for their policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create bindings for their policies" ON public.policy_bindings FOR INSERT WITH CHECK ((policy_id IN ( SELECT policies.id
   FROM public.policies
  WHERE (policies.system_id IN ( SELECT agents.id
           FROM public.agents
          WHERE (agents.owner_id = auth.uid()))))));


--
-- Name: contact_expert_logs Users can create contact logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create contact logs" ON public.contact_expert_logs FOR INSERT WITH CHECK (true);


--
-- Name: deployment_tracking Users can create deployment tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deployment tracking" ON public.deployment_tracking FOR INSERT WITH CHECK ((auth.uid() = deployed_by));


--
-- Name: deployments Users can create deployments for their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deployments for their own agents" ON public.deployments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = deployments.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: documents Users can create documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create documents" ON public.documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: workflow_edges Users can create edges in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create edges in their workflows" ON public.workflow_edges FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_edges.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: agent_exports Users can create exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create exports" ON public.agent_exports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: intelligence_settings Users can create intelligence settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create intelligence settings" ON public.intelligence_settings FOR INSERT WITH CHECK ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: workflow_nodes Users can create nodes in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create nodes in their workflows" ON public.workflow_nodes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_nodes.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: document_analysis_jobs Users can create own analysis jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own analysis jobs" ON public.document_analysis_jobs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: copilot_sessions Users can create own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own sessions" ON public.copilot_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: policies Users can create policies for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create policies for their systems" ON public.policies FOR INSERT WITH CHECK (((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))) AND (auth.uid() = created_by)));


--
-- Name: agent_runs Users can create runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create runs" ON public.agent_runs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sovereign_dc_simulation_runs Users can create simulation runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create simulation runs" ON public.sovereign_dc_simulation_runs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: mcp_tokens Users can create their own MCP tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own MCP tokens" ON public.mcp_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: agent_runs Users can create their own agent runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own agent runs" ON public.agent_runs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: agents Users can create their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own agents" ON public.agents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_id));


--
-- Name: agent_conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.agent_conversations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: digital_twin_runs Users can create their own digital twin runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own digital twin runs" ON public.digital_twin_runs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: digital_twins Users can create their own digital twins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own digital twins" ON public.digital_twins FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: agent_drafts Users can create their own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own drafts" ON public.agent_drafts FOR INSERT WITH CHECK ((auth.uid() = owner_id));


--
-- Name: sovereign_dc_facilities Users can create their own facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own facilities" ON public.sovereign_dc_facilities FOR INSERT WITH CHECK ((auth.uid() = owner_id));


--
-- Name: workflow_runs Users can create workflow runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workflow runs" ON public.workflow_runs FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: workflows Users can create workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workflows" ON public.workflows FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: policy_bindings Users can delete bindings for their policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete bindings for their policies" ON public.policy_bindings FOR DELETE USING ((policy_id IN ( SELECT policies.id
   FROM public.policies
  WHERE (policies.system_id IN ( SELECT agents.id
           FROM public.agents
          WHERE (agents.owner_id = auth.uid()))))));


--
-- Name: workflow_edges Users can delete edges in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete edges in their workflows" ON public.workflow_edges FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_edges.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: agent_integrations Users can delete integrations for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete integrations for their agents" ON public.agent_integrations FOR DELETE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: workflow_nodes Users can delete nodes in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete nodes in their workflows" ON public.workflow_nodes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_nodes.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: policies Users can delete policies for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete policies for their systems" ON public.policies FOR DELETE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: system_integrations Users can delete system integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete system integrations" ON public.system_integrations FOR DELETE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: mcp_tokens Users can delete their own MCP tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own MCP tokens" ON public.mcp_tokens FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: rag_items Users can delete their own RAG items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own RAG items" ON public.rag_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: agents Users can delete their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own agents" ON public.agents FOR DELETE TO authenticated USING ((auth.uid() = owner_id));


--
-- Name: copilot_sessions_cache Users can delete their own cache entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own cache entries" ON public.copilot_sessions_cache FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: integrations_connections Users can delete their own connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own connections" ON public.integrations_connections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: agent_custom_questions Users can delete their own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own custom questions" ON public.agent_custom_questions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: digital_twins Users can delete their own digital twins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own digital twins" ON public.digital_twins FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: agent_drafts Users can delete their own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own drafts" ON public.agent_drafts FOR DELETE USING ((auth.uid() = owner_id));


--
-- Name: sovereign_dc_facilities Users can delete their own facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own facilities" ON public.sovereign_dc_facilities FOR DELETE USING ((auth.uid() = owner_id));


--
-- Name: indexed_content Users can delete their own indexed content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own indexed content" ON public.indexed_content FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: integrations_tokens Users can delete their own integration tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own integration tokens" ON public.integrations_tokens FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: knowledge_sources Users can delete their own knowledge sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own knowledge sources" ON public.knowledge_sources FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: copilot_memory Users can delete their own memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own memory" ON public.copilot_memory FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: workflows Users can delete their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own workflows" ON public.workflows FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: page_classifications Users can insert classifications for their pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert classifications for their pages" ON public.page_classifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.captured_pages
  WHERE ((captured_pages.id = page_classifications.page_id) AND (captured_pages.user_id = auth.uid())))));


--
-- Name: agent_integrations Users can insert integrations for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert integrations for their agents" ON public.agent_integrations FOR INSERT WITH CHECK ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_messages Users can insert messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages in their conversations" ON public.agent_messages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agent_conversations
  WHERE ((agent_conversations.id = agent_messages.conversation_id) AND (agent_conversations.user_id = auth.uid())))));


--
-- Name: page_summaries Users can insert summaries for their pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert summaries for their pages" ON public.page_summaries FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.captured_pages
  WHERE ((captured_pages.id = page_summaries.page_id) AND (captured_pages.user_id = auth.uid())))));


--
-- Name: system_integrations Users can insert system integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert system integrations" ON public.system_integrations FOR INSERT WITH CHECK ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: rag_items Users can insert their own RAG items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own RAG items" ON public.rag_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: roi_assumptions Users can insert their own ROI assumptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own ROI assumptions" ON public.roi_assumptions FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT workflows.created_by
   FROM public.workflows
  WHERE (workflows.system_id = roi_assumptions.system_id))));


--
-- Name: audit_logs Users can insert their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: system_builder_state Users can insert their own builder state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own builder state" ON public.system_builder_state FOR INSERT WITH CHECK ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: copilot_sessions_cache Users can insert their own cache entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own cache entries" ON public.copilot_sessions_cache FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: captured_pages Users can insert their own captured pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own captured pages" ON public.captured_pages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: integrations_connections Users can insert their own connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own connections" ON public.integrations_connections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: copilot_events Users can insert their own copilot events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own copilot events" ON public.copilot_events FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: agent_custom_questions Users can insert their own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own custom questions" ON public.agent_custom_questions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: indexed_content Users can insert their own indexed content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own indexed content" ON public.indexed_content FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: integrations_tokens Users can insert their own integration tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own integration tokens" ON public.integrations_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: knowledge_sources Users can insert their own knowledge sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own knowledge sources" ON public.knowledge_sources FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: copilot_memory Users can insert their own memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own memory" ON public.copilot_memory FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles Users can insert their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own roles" ON public.user_roles FOR INSERT WITH CHECK (((user_id = auth.uid()) OR public.check_user_has_role(auth.uid(), 'admin'::text)));


--
-- Name: search_history Users can insert their own search history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own search history" ON public.search_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: integration_sync_logs Users can insert their own sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own sync logs" ON public.integration_sync_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: mcp_credentials Users can manage their own MCP credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own MCP credentials" ON public.mcp_credentials USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: rag_tokens Users can manage their own RAG tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own RAG tokens" ON public.rag_tokens USING ((auth.uid() = user_id));


--
-- Name: agent_memory Users can manage their own agent memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own agent memory" ON public.agent_memory USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: rag_documents Users can manage their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own documents" ON public.rag_documents USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: integrations Users can manage their own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own integrations" ON public.integrations USING ((auth.uid() = user_id));


--
-- Name: industry_agents Users can update connection status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update connection status" ON public.industry_agents FOR UPDATE USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: agent_integrations Users can update integrations for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update integrations for their agents" ON public.agent_integrations FOR UPDATE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: workflow_nodes Users can update nodes in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update nodes in their workflows" ON public.workflow_nodes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_nodes.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: document_analysis_jobs Users can update own analysis jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own analysis jobs" ON public.document_analysis_jobs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: copilot_sessions Users can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sessions" ON public.copilot_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: policies Users can update policies for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update policies for their systems" ON public.policies FOR UPDATE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: system_integrations Users can update system integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update system integrations" ON public.system_integrations FOR UPDATE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: mcp_tokens Users can update their own MCP tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own MCP tokens" ON public.mcp_tokens FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: rag_items Users can update their own RAG items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own RAG items" ON public.rag_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: roi_assumptions Users can update their own ROI assumptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ROI assumptions" ON public.roi_assumptions FOR UPDATE USING ((auth.uid() IN ( SELECT workflows.created_by
   FROM public.workflows
  WHERE (workflows.system_id = roi_assumptions.system_id))));


--
-- Name: agent_runs Users can update their own agent runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own agent runs" ON public.agent_runs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: agents Users can update their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE TO authenticated USING ((auth.uid() = owner_id));


--
-- Name: system_builder_state Users can update their own builder state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own builder state" ON public.system_builder_state FOR UPDATE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: copilot_sessions_cache Users can update their own cache entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own cache entries" ON public.copilot_sessions_cache FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: captured_pages Users can update their own captured pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own captured pages" ON public.captured_pages FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: integrations_connections Users can update their own connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own connections" ON public.integrations_connections FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: agent_conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.agent_conversations FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: deployment_tracking Users can update their own deployment tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own deployment tracking" ON public.deployment_tracking FOR UPDATE USING ((auth.uid() = deployed_by));


--
-- Name: deployments Users can update their own deployments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own deployments" ON public.deployments FOR UPDATE USING ((auth.uid() = deployed_by));


--
-- Name: digital_twin_runs Users can update their own digital twin runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own digital twin runs" ON public.digital_twin_runs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: digital_twins Users can update their own digital twins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own digital twins" ON public.digital_twins FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: agent_drafts Users can update their own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own drafts" ON public.agent_drafts FOR UPDATE USING ((auth.uid() = owner_id));


--
-- Name: sovereign_dc_facilities Users can update their own facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own facilities" ON public.sovereign_dc_facilities FOR UPDATE USING ((auth.uid() = owner_id));


--
-- Name: indexed_content Users can update their own indexed content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own indexed content" ON public.indexed_content FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: integrations_tokens Users can update their own integration tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own integration tokens" ON public.integrations_tokens FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: intelligence_settings Users can update their own intelligence settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own intelligence settings" ON public.intelligence_settings FOR UPDATE USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: knowledge_sources Users can update their own knowledge sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own knowledge sources" ON public.knowledge_sources FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: copilot_memory Users can update their own memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own memory" ON public.copilot_memory FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: workflows Users can update their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own workflows" ON public.workflows FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: sovereign_dc_simulation_runs Users can update their simulation runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their simulation runs" ON public.sovereign_dc_simulation_runs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: agent_action_logs Users can view action logs for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view action logs for their agents" ON public.agent_action_logs FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agents Users can view agents in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view agents in their org" ON public.agents FOR SELECT USING (((auth.uid() = owner_id) OR (org_id IS NOT NULL)));


--
-- Name: policy_audit Users can view audit logs for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audit logs for their systems" ON public.policy_audit FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: policy_bindings Users can view bindings for their policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bindings for their policies" ON public.policy_bindings FOR SELECT USING ((policy_id IN ( SELECT policies.id
   FROM public.policies
  WHERE (policies.system_id IN ( SELECT agents.id
           FROM public.agents
          WHERE (agents.owner_id = auth.uid()))))));


--
-- Name: rag_chunks Users can view chunks for their items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chunks for their items" ON public.rag_chunks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.rag_items
  WHERE ((rag_items.id = rag_chunks.item_id) AND (rag_items.user_id = auth.uid())))));


--
-- Name: page_classifications Users can view classifications for their pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view classifications for their pages" ON public.page_classifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.captured_pages
  WHERE ((captured_pages.id = page_classifications.page_id) AND (captured_pages.user_id = auth.uid())))));


--
-- Name: workflow_edges Users can view edges in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view edges in their workflows" ON public.workflow_edges FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_edges.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: workflow_run_events Users can view events for their runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view events for their runs" ON public.workflow_run_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.workflow_runs
  WHERE ((workflow_runs.id = workflow_run_events.run_id) AND (workflow_runs.created_by = auth.uid())))));


--
-- Name: system_events Users can view events for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view events for their systems" ON public.system_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = system_events.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: system_health Users can view health for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view health for their systems" ON public.system_health FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = system_health.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: heartbeats Users can view heartbeats for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view heartbeats for their systems" ON public.heartbeats FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = heartbeats.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: agent_integrations Users can view integrations for their agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view integrations for their agents" ON public.agent_integrations FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: team_invites Users can view invites in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invites in their org" ON public.team_invites FOR SELECT USING (((auth.uid() = invited_by) OR (email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text)));


--
-- Name: agent_messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.agent_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.agent_conversations
  WHERE ((agent_conversations.id = agent_messages.conversation_id) AND (agent_conversations.user_id = auth.uid())))));


--
-- Name: workflow_nodes Users can view nodes in their workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view nodes in their workflows" ON public.workflow_nodes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_nodes.workflow_id) AND (workflows.created_by = auth.uid())))));


--
-- Name: document_analysis_jobs Users can view own analysis jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own analysis jobs" ON public.document_analysis_jobs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: copilot_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.copilot_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: policies Users can view policies for their systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view policies for their systems" ON public.policies FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: sovereign_dc_simulation_runs Users can view simulation runs for their facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view simulation runs for their facilities" ON public.sovereign_dc_simulation_runs FOR SELECT USING (((user_id = auth.uid()) OR (facility_id IN ( SELECT sovereign_dc_facilities.id
   FROM public.sovereign_dc_facilities
  WHERE (sovereign_dc_facilities.owner_id = auth.uid())))));


--
-- Name: page_summaries Users can view summaries for their pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view summaries for their pages" ON public.page_summaries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.captured_pages
  WHERE ((captured_pages.id = page_summaries.page_id) AND (captured_pages.user_id = auth.uid())))));


--
-- Name: system_integrations Users can view system integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view system integrations" ON public.system_integrations FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: organizations Users can view their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization" ON public.organizations FOR SELECT USING ((id IN ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: mcp_tokens Users can view their own MCP tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own MCP tokens" ON public.mcp_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: rag_items Users can view their own RAG items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own RAG items" ON public.rag_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: roi_assumptions Users can view their own ROI assumptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own ROI assumptions" ON public.roi_assumptions FOR SELECT USING ((auth.uid() IN ( SELECT workflows.created_by
   FROM public.workflows
  WHERE (workflows.system_id = roi_assumptions.system_id))));


--
-- Name: roi_snapshots Users can view their own ROI snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own ROI snapshots" ON public.roi_snapshots FOR SELECT USING ((auth.uid() IN ( SELECT workflows.created_by
   FROM public.workflows
  WHERE (workflows.system_id = roi_snapshots.system_id))));


--
-- Name: agent_runs Users can view their own agent runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own agent runs" ON public.agent_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agents Users can view their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own agents" ON public.agents FOR SELECT TO authenticated USING ((auth.uid() = owner_id));


--
-- Name: system_builder_state Users can view their own builder state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own builder state" ON public.system_builder_state FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: copilot_sessions_cache Users can view their own cache entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cache entries" ON public.copilot_sessions_cache FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: captured_pages Users can view their own captured pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own captured pages" ON public.captured_pages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: integrations_connections Users can view their own connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own connections" ON public.integrations_connections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: contact_expert_logs Users can view their own contact logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own contact logs" ON public.contact_expert_logs FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: agent_conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.agent_conversations FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: copilot_events Users can view their own copilot events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own copilot events" ON public.copilot_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agent_custom_questions Users can view their own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own custom questions" ON public.agent_custom_questions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: deployment_tracking Users can view their own deployment tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deployment tracking" ON public.deployment_tracking FOR SELECT USING ((auth.uid() = deployed_by));


--
-- Name: deployments Users can view their own deployments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deployments" ON public.deployments FOR SELECT USING (((auth.uid() = deployed_by) OR (auth.uid() IN ( SELECT workflows.created_by
   FROM public.workflows
  WHERE (workflows.system_id = deployments.system_id)))));


--
-- Name: digital_twin_runs Users can view their own digital twin runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own digital twin runs" ON public.digital_twin_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: digital_twins Users can view their own digital twins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own digital twins" ON public.digital_twins FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: documents Users can view their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agent_drafts Users can view their own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own drafts" ON public.agent_drafts FOR SELECT USING ((auth.uid() = owner_id));


--
-- Name: agent_exports Users can view their own exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own exports" ON public.agent_exports FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: sovereign_dc_facilities Users can view their own facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own facilities" ON public.sovereign_dc_facilities FOR SELECT USING ((auth.uid() = owner_id));


--
-- Name: indexed_content Users can view their own indexed content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own indexed content" ON public.indexed_content FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: integrations_tokens Users can view their own integration tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own integration tokens" ON public.integrations_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: integrations Users can view their own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own integrations" ON public.integrations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: intelligence_settings Users can view their own intelligence settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own intelligence settings" ON public.intelligence_settings FOR SELECT USING ((system_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: knowledge_sources Users can view their own knowledge sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own knowledge sources" ON public.knowledge_sources FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: copilot_memory Users can view their own memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memory" ON public.copilot_memory FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: oauth_states Users can view their own oauth states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own oauth states" ON public.oauth_states FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: agent_runs Users can view their own runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own runs" ON public.agent_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: search_history Users can view their own search history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own search history" ON public.search_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: integration_sync_logs Users can view their own sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sync logs" ON public.integration_sync_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: workflows Users can view their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own workflows" ON public.workflows FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: workflow_runs Users can view their workflow runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workflow runs" ON public.workflow_runs FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: agent_activity_logs activity_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_logs_insert ON public.agent_activity_logs FOR INSERT WITH CHECK (true);


--
-- Name: agent_activity_logs activity_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_logs_select ON public.agent_activity_logs FOR SELECT USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_action_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_action_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_custom_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_custom_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_environments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_environments ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_exports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_exports ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_runtime_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_runtime_status ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_suggestions_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_suggestions_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_versions agent_versions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_versions_insert ON public.agent_versions FOR INSERT WITH CHECK ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_versions agent_versions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_versions_select ON public.agent_versions FOR SELECT USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_workflows agent_workflows_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_workflows_all ON public.agent_workflows USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid())))) WITH CHECK ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_workflows agent_workflows_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_workflows_select ON public.agent_workflows FOR SELECT USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

--
-- Name: agents agents_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agents_delete_own ON public.agents FOR DELETE TO authenticated USING ((auth.uid() = owner_id));


--
-- Name: agents agents_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agents_insert_own ON public.agents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_id));


--
-- Name: agents agents_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agents_select_own ON public.agents FOR SELECT TO authenticated USING ((auth.uid() = owner_id));


--
-- Name: agents agents_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agents_update_own ON public.agents FOR UPDATE TO authenticated USING ((auth.uid() = owner_id)) WITH CHECK ((auth.uid() = owner_id));


--
-- Name: ai_recommendations_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_recommendations_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_builder_state builder_state_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY builder_state_insert_own ON public.system_builder_state FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = system_builder_state.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: system_builder_state builder_state_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY builder_state_select_own ON public.system_builder_state FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = system_builder_state.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: system_builder_state builder_state_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY builder_state_update_own ON public.system_builder_state FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = system_builder_state.system_id) AND (agents.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents
  WHERE ((agents.id = system_builder_state.system_id) AND (agents.owner_id = auth.uid())))));


--
-- Name: capture_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capture_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: captured_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.captured_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: cloud_deployments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cloud_deployments ENABLE ROW LEVEL SECURITY;

--
-- Name: cloud_deployments cloud_deployments_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cloud_deployments_all ON public.cloud_deployments USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid())))) WITH CHECK ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: cloud_deployments cloud_deployments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cloud_deployments_select ON public.cloud_deployments FOR SELECT USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: contact_expert_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_expert_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: content_embeddings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

--
-- Name: copilot_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.copilot_events ENABLE ROW LEVEL SECURITY;

--
-- Name: copilot_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.copilot_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: copilot_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.copilot_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: copilot_sessions_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.copilot_sessions_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: crawl_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: deployment_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deployment_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: deployments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

--
-- Name: digital_twin_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.digital_twin_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: digital_twins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;

--
-- Name: document_analysis_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_analysis_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: environments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_environments environments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY environments_select ON public.agent_environments FOR SELECT USING (true);


--
-- Name: funding_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.funding_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: heartbeats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.heartbeats ENABLE ROW LEVEL SECURITY;

--
-- Name: indexed_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.indexed_content ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: integrations_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integrations_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: integrations_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integrations_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: intelligence_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intelligence_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: m2m_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.m2m_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_servers_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_servers_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_sync_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_sync_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: page_classifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_classifications ENABLE ROW LEVEL SECURITY;

--
-- Name: page_summaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

--
-- Name: policy_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.policy_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: policy_bindings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.policy_bindings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_items ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: roi_assumptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roi_assumptions ENABLE ROW LEVEL SECURITY;

--
-- Name: roi_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roi_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_runtime_status runtime_status_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY runtime_status_insert ON public.agent_runtime_status FOR INSERT WITH CHECK ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_runtime_status runtime_status_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY runtime_status_select ON public.agent_runtime_status FOR SELECT USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: agent_runtime_status runtime_status_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY runtime_status_update ON public.agent_runtime_status FOR UPDATE USING ((agent_id IN ( SELECT agents.id
   FROM public.agents
  WHERE (agents.owner_id = auth.uid()))));


--
-- Name: scraper_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: search_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: search_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

--
-- Name: site_crawls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_crawls ENABLE ROW LEVEL SECURITY;

--
-- Name: site_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: sites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

--
-- Name: sovereign_dc_facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sovereign_dc_facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: sovereign_dc_simulation_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sovereign_dc_simulation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_builder_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_builder_state ENABLE ROW LEVEL SECURITY;

--
-- Name: system_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

--
-- Name: system_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

--
-- Name: system_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_admin_manage ON public.user_roles USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text) AND ((ur.scope = 'global'::text) OR (ur.scope IS NULL)) AND ((ur.expires_at IS NULL) OR (ur.expires_at > now()))))));


--
-- Name: user_roles user_roles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: website_content_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.website_content_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_edges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_nodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_run_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_run_events ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: zapier_apps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zapier_apps ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



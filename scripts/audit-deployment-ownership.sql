-- Read-only deployment ownership and integrity audit.
-- Run before and after the forward migration; this script changes no data.

BEGIN TRANSACTION READ ONLY;

SELECT
  (SELECT count(*) FROM public.deployments) AS deployments,
  (SELECT count(*) FROM public.deployment_events) AS deployment_events,
  (SELECT count(*) FROM public.deployment_tracking) AS deprecated_tracking_rows,
  (SELECT count(*) FROM public.cloud_deployments) AS specialized_cloud_rows;

SELECT
  count(*) FILTER (WHERE a.id IS NULL) AS orphan_system_ids,
  count(*) FILTER (WHERE d.deployed_by IS NULL) AS missing_deployment_actor,
  count(*) FILTER (
    WHERE NULLIF(to_jsonb(d)->>'org_id', '')::uuid IS DISTINCT FROM a.org_id
  ) AS organization_scope_mismatches
FROM public.deployments d
LEFT JOIN public.agents a ON a.id = d.system_id;

SELECT
  count(*) FILTER (WHERE d.id IS NULL) AS orphan_parent_deployments,
  count(*) FILTER (
    WHERE d.id IS NOT NULL AND e.system_id IS DISTINCT FROM d.system_id
  ) AS event_system_mismatches,
  count(*) FILTER (WHERE e.actor_id IS NULL) AS missing_event_actor
FROM public.deployment_events e
LEFT JOIN public.deployments d ON d.id = e.deployment_id;

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('deployments', 'deployment_events');

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_schema = tc.constraint_schema
 AND kcu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_schema = tc.constraint_schema
 AND ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('deployments', 'deployment_events')
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('deployments', 'deployment_events')
ORDER BY tablename, policyname;

SELECT
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('deployments', 'deployment_events')
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

ROLLBACK;

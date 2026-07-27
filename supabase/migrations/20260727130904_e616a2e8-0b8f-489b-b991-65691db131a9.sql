-- Defense-in-depth: strip the workspace default grants that landed on every
-- new public.dsx_* table. RLS already denies these, but the grants themselves
-- should not exist.

REVOKE ALL ON public.dsx_connections        FROM anon;
REVOKE ALL ON public.dsx_asset_mappings     FROM anon;
REVOKE ALL ON public.dsx_events             FROM anon;
REVOKE ALL ON public.dsx_events_quarantine  FROM anon;
REVOKE ALL ON public.dsx_gateway_heartbeats FROM anon;
REVOKE ALL ON public.dsx_ingestion_audit    FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dsx_connections        FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dsx_asset_mappings     FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dsx_events             FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dsx_events_quarantine  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dsx_gateway_heartbeats FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dsx_ingestion_audit    FROM authenticated;

-- Re-affirm the intended grants (SELECT to authenticated, ALL to service_role).
GRANT SELECT ON public.dsx_connections        TO authenticated;
GRANT SELECT ON public.dsx_asset_mappings     TO authenticated;
GRANT SELECT ON public.dsx_events             TO authenticated;
GRANT SELECT ON public.dsx_events_quarantine  TO authenticated;
GRANT SELECT ON public.dsx_gateway_heartbeats TO authenticated;
GRANT SELECT ON public.dsx_ingestion_audit    TO authenticated;

GRANT ALL ON public.dsx_connections        TO service_role;
GRANT ALL ON public.dsx_asset_mappings     TO service_role;
GRANT ALL ON public.dsx_events             TO service_role;
GRANT ALL ON public.dsx_events_quarantine  TO service_role;
GRANT ALL ON public.dsx_gateway_heartbeats TO service_role;
GRANT ALL ON public.dsx_ingestion_audit    TO service_role;
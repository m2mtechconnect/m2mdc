REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON
  public.connector_definitions,
  public.connection_data_contracts,
  public.connection_health_checks,
  public.connection_ingest_runs,
  public.connection_audit_events
FROM authenticated;

GRANT SELECT ON
  public.connector_definitions,
  public.connection_data_contracts,
  public.connection_health_checks,
  public.connection_ingest_runs,
  public.connection_audit_events
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_twin_mappings TO authenticated;

GRANT ALL ON public.connector_definitions TO service_role;
GRANT ALL ON public.connection_instances TO service_role;
GRANT ALL ON public.connection_data_contracts TO service_role;
GRANT ALL ON public.connection_twin_mappings TO service_role;
GRANT ALL ON public.connection_health_checks TO service_role;
GRANT ALL ON public.connection_ingest_runs TO service_role;
GRANT ALL ON public.connection_audit_events TO service_role;
DO $$
DECLARE
  _a uuid := '11111111-1111-1111-1111-1111111111a1';
  _b uuid := '22222222-2222-2222-2222-2222222222b1';
BEGIN
  DELETE FROM public.connection_audit_events WHERE tenant_id IN (_a, _b);
  DELETE FROM public.connection_health_checks
    WHERE connection_id IN (SELECT id FROM public.connection_instances WHERE tenant_id IN (_a, _b));
  DELETE FROM public.connection_instances WHERE tenant_id IN (_a, _b);
  DELETE FROM public.connection_data_contracts WHERE tenant_id IN (_a, _b);
  DELETE FROM public.connector_definitions WHERE id::text LIKE '%' AND name ILIKE 'aura_test_probe%';

  UPDATE public.profiles SET org_id = NULL WHERE org_id IN (_a, _b);
END;
$$;
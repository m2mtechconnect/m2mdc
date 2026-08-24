-- AURA enterprise Phase 7: Edge Gateway identity and lifecycle contract.
-- Registry only: this does not claim industrial protocol adapters are runtime-qualified.

BEGIN;

CREATE TABLE public.edge_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.sovereign_dc_facilities(id) ON DELETE SET NULL,
  twin_id uuid REFERENCES public.data_centre_twins(id) ON DELETE SET NULL,
  gateway_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  software_version text,
  transport text NOT NULL DEFAULT 'https_mqtt',
  certificate_fingerprint text,
  credential_reference text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  desired_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  reported_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enrolled_at timestamptz,
  last_seen_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT edge_gateways_status_check CHECK (
    status = ANY (ARRAY['DRAFT','REGISTERED','ONLINE','OFFLINE','DEGRADED','REVOKED']::text[])
  ),
  CONSTRAINT edge_gateways_transport_check CHECK (
    transport = ANY (ARRAY['https_mqtt','https','mqtt']::text[])
  ),
  CONSTRAINT edge_gateways_secret_reference_check CHECK (
    credential_reference IS NULL OR credential_reference !~* '(password|secret|token)='
  )
);

CREATE INDEX idx_edge_gateways_org_status ON public.edge_gateways(org_id, status);
CREATE INDEX idx_edge_gateways_facility ON public.edge_gateways(facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX idx_edge_gateways_twin ON public.edge_gateways(twin_id) WHERE twin_id IS NOT NULL;
CREATE INDEX idx_edge_gateways_last_seen ON public.edge_gateways(last_seen_at DESC) WHERE last_seen_at IS NOT NULL;

CREATE TABLE public.edge_gateway_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES public.edge_gateways(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT edge_gateway_events_severity_check CHECK (
    severity = ANY (ARRAY['info','warning','error','critical']::text[])
  )
);

CREATE INDEX idx_edge_gateway_events_gateway_time
  ON public.edge_gateway_events(gateway_id, occurred_at DESC);

-- Prevent cross-tenant resource binding. The registry can point only at
-- facility/twin rows owned by the same organization as the gateway.
CREATE OR REPLACE FUNCTION public.validate_edge_gateway_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_org uuid;
  v_twin_org uuid;
BEGIN
  IF NEW.facility_id IS NOT NULL THEN
    SELECT org_id INTO v_facility_org
    FROM public.sovereign_dc_facilities
    WHERE id = NEW.facility_id;

    IF v_facility_org IS NULL OR v_facility_org <> NEW.org_id THEN
      RAISE EXCEPTION 'edge gateway facility must belong to the same organization';
    END IF;
  END IF;

  IF NEW.twin_id IS NOT NULL THEN
    SELECT org_id INTO v_twin_org
    FROM public.data_centre_twins
    WHERE id = NEW.twin_id;

    IF v_twin_org IS NULL OR v_twin_org <> NEW.org_id THEN
      RAISE EXCEPTION 'edge gateway twin must belong to the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_edge_gateway_scope() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER edge_gateways_validate_scope
BEFORE INSERT OR UPDATE OF org_id, facility_id, twin_id ON public.edge_gateways
FOR EACH ROW EXECUTE FUNCTION public.validate_edge_gateway_scope();

GRANT SELECT ON public.edge_gateways TO authenticated;
GRANT SELECT ON public.edge_gateway_events TO authenticated;
GRANT ALL ON public.edge_gateways TO service_role;
GRANT ALL ON public.edge_gateway_events TO service_role;

ALTER TABLE public.edge_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_gateway_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY edge_gateways_read
  ON public.edge_gateways
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY edge_gateway_events_read
  ON public.edge_gateway_events
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.edge_gateways g
    WHERE g.id = edge_gateway_events.gateway_id
      AND public.is_org_member(g.org_id, auth.uid())
  ));

-- No authenticated write policies are created in this phase. Registration,
-- certificate issuance, heartbeat and capability reports require a future
-- signed gateway boundary; until then only guarded service-role workflows may
-- mutate gateway state.

COMMIT;
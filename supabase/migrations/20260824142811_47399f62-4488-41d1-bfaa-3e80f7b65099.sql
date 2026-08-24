BEGIN;

CREATE TABLE IF NOT EXISTS public.organization_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'unassigned',
  entitlement_status text NOT NULL DEFAULT 'UNCONFIGURED'
    CHECK (entitlement_status IN ('UNCONFIGURED', 'ACTIVE', 'SUSPENDED', 'EXPIRED')),
  enforcement_mode text NOT NULL DEFAULT 'OBSERVE_ONLY'
    CHECK (enforcement_mode IN ('OBSERVE_ONLY', 'ENFORCED')),
  max_facilities integer CHECK (max_facilities IS NULL OR max_facilities >= 0),
  max_users integer CHECK (max_users IS NULL OR max_users >= 0),
  max_twins integer CHECK (max_twins IS NULL OR max_twins >= 0),
  max_connections integer CHECK (max_connections IS NULL OR max_connections >= 0),
  ai_monthly_units bigint CHECK (ai_monthly_units IS NULL OR ai_monthly_units >= 0),
  storage_gb bigint CHECK (storage_gb IS NULL OR storage_gb >= 0),
  deployment_type text NOT NULL DEFAULT 'shared_cloud'
    CHECK (deployment_type IN ('shared_cloud', 'dedicated_cloud', 'private_cloud', 'hybrid', 'sovereign_air_gapped')),
  support_level text NOT NULL DEFAULT 'standard',
  billing_provider text NOT NULL DEFAULT 'none'
    CHECK (billing_provider IN ('none', 'chargebee', 'stripe', 'paddle')),
  billing_customer_ref text,
  billing_subscription_ref text,
  effective_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.organization_entitlements (org_id)
SELECT id FROM public.organizations
ON CONFLICT (org_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_organization_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.organization_entitlements (org_id)
  VALUES (NEW.id)
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_organization_entitlements() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizations_seed_entitlements ON public.organizations;
CREATE TRIGGER organizations_seed_entitlements
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.seed_organization_entitlements();

ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.organization_entitlements FROM anon, authenticated;
GRANT SELECT ON public.organization_entitlements TO authenticated;
GRANT ALL ON public.organization_entitlements TO service_role;

CREATE POLICY "Organization members can read entitlements"
ON public.organization_entitlements
FOR SELECT
TO authenticated
USING (
  public.is_org_member(org_id, auth.uid())
  OR public.user_has_role(auth.uid(), 'owner', 'global')
);

CREATE INDEX IF NOT EXISTS organization_entitlements_status_idx
  ON public.organization_entitlements (entitlement_status, billing_provider);

COMMIT;
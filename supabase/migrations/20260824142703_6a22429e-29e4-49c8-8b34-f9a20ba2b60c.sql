-- AURA enterprise Phase 6: deployment profiles and capability truth.
-- This models where AURA runs without pretending to provision infrastructure.

BEGIN;

CREATE TABLE public.organization_deployment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  deployment_type text NOT NULL DEFAULT 'shared_cloud',
  capability_status text NOT NULL DEFAULT 'AVAILABLE',
  lifecycle_status text NOT NULL DEFAULT 'ACTIVE',
  automation_status text NOT NULL DEFAULT 'EXISTING_PLATFORM',
  hosting_provider text NOT NULL DEFAULT 'm2m_managed',
  preferred_region text,
  control_plane_location text NOT NULL DEFAULT 'm2m_managed_cloud',
  data_plane_location text NOT NULL DEFAULT 'm2m_managed_cloud',
  customer_managed boolean NOT NULL DEFAULT false,
  edge_required boolean NOT NULL DEFAULT false,
  data_residency text,
  capability_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_deployment_profiles_type_check CHECK (
    deployment_type = ANY (ARRAY[
      'shared_cloud',
      'dedicated_cloud',
      'private_cloud',
      'hybrid',
      'sovereign_air_gapped'
    ]::text[])
  ),
  CONSTRAINT organization_deployment_profiles_capability_check CHECK (
    capability_status = ANY (ARRAY['AVAILABLE','PARTIAL','PLANNED','UNAVAILABLE']::text[])
  ),
  CONSTRAINT organization_deployment_profiles_lifecycle_check CHECK (
    lifecycle_status = ANY (ARRAY['PLANNED','REQUESTED','PROVISIONING','ACTIVE','DEGRADED','FAILED','RETIRED']::text[])
  ),
  CONSTRAINT organization_deployment_profiles_automation_check CHECK (
    automation_status = ANY (ARRAY['EXISTING_PLATFORM','MANUAL','PARTIAL','AUTOMATED','NOT_AVAILABLE']::text[])
  )
);

CREATE INDEX idx_organization_deployment_profiles_type
  ON public.organization_deployment_profiles(deployment_type, capability_status);

-- Current production topology is the shared M2M-managed cloud. Backfill every
-- existing organization to that truthful state. This does not imply a separate
-- physical environment per organization; tenant isolation is logical/RLS based.
INSERT INTO public.organization_deployment_profiles (
  org_id,
  deployment_type,
  capability_status,
  lifecycle_status,
  automation_status,
  hosting_provider,
  control_plane_location,
  data_plane_location,
  customer_managed,
  edge_required,
  notes
)
SELECT
  o.id,
  'shared_cloud',
  'AVAILABLE',
  'ACTIVE',
  'EXISTING_PLATFORM',
  'm2m_managed',
  'm2m_managed_cloud',
  'm2m_managed_cloud',
  false,
  false,
  'Current shared AURA control/data plane. Infrastructure provisioning is not performed by the Builder.'
FROM public.organizations o
ON CONFLICT (org_id) DO NOTHING;

-- New organizations automatically receive the same truthful current profile.
CREATE OR REPLACE FUNCTION public.seed_organization_deployment_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.organization_deployment_profiles (
    org_id,
    deployment_type,
    capability_status,
    lifecycle_status,
    automation_status,
    hosting_provider,
    control_plane_location,
    data_plane_location,
    customer_managed,
    edge_required,
    notes
  )
  VALUES (
    NEW.id,
    'shared_cloud',
    'AVAILABLE',
    'ACTIVE',
    'EXISTING_PLATFORM',
    'm2m_managed',
    'm2m_managed_cloud',
    'm2m_managed_cloud',
    false,
    false,
    'Current shared AURA control/data plane. Infrastructure provisioning is not performed by the Builder.'
  )
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_organization_deployment_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizations_seed_deployment_profile ON public.organizations;
CREATE TRIGGER organizations_seed_deployment_profile
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.seed_organization_deployment_profile();

GRANT SELECT ON public.organization_deployment_profiles TO authenticated;
GRANT ALL ON public.organization_deployment_profiles TO service_role;
ALTER TABLE public.organization_deployment_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_deployment_profiles_read ON public.organization_deployment_profiles;
CREATE POLICY organization_deployment_profiles_read
  ON public.organization_deployment_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(org_id, auth.uid())
    OR public.user_has_role(auth.uid(), 'owner', 'global')
  );

-- Writes are platform/service controlled until a dedicated request/approval
-- workflow exists. Customer-facing controls must not be able to mark a planned
-- topology AVAILABLE or ACTIVE by editing a row directly.

COMMIT;
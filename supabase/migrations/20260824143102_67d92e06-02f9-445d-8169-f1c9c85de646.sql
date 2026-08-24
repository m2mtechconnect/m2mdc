BEGIN;

-- Canonicalize public.agents tenancy against org_memberships.
--
-- The legacy org SELECT policy used profiles.org_id, which is a compatibility
-- pointer rather than the authoritative membership source. Builder reads now
-- intentionally rely on agents RLS, so the table policy must use the same
-- active membership model as the rest of the enterprise tenancy plane.

-- Compatibility stamp: older application builds create agents without sending
-- org_id. If the authenticated caller has an active organization, stamp that
-- organization before RLS WITH CHECK runs. A platform-only caller with no
-- active organization may continue creating a legacy owner-only null-org row.
-- A caller may never nominate a different organization.
CREATE OR REPLACE FUNCTION public.stamp_agent_active_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_org_id := public.active_org_id();

  IF v_org_id IS NULL THEN
    IF NEW.org_id IS NOT NULL THEN
      RAISE EXCEPTION 'active organization is required for organization-owned agent insert';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.org_id IS NULL THEN
    NEW.org_id := v_org_id;
  ELSIF NEW.org_id IS DISTINCT FROM v_org_id THEN
    RAISE EXCEPTION 'agent organization must match the active organization';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_agent_active_org_id() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS agents_stamp_org ON public.agents;
CREATE TRIGGER agents_stamp_org
BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.stamp_agent_active_org_id();

-- Remove overlapping permissive policies so an org-owned row cannot retain an
-- owner-only bypass after organization assignment.
DROP POLICY IF EXISTS "Users can view agents in their org" ON public.agents;
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
DROP POLICY IF EXISTS agents_select_own ON public.agents;

DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
DROP POLICY IF EXISTS agents_insert_own ON public.agents;

DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
DROP POLICY IF EXISTS agents_update_own ON public.agents;

DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
DROP POLICY IF EXISTS agents_delete_own ON public.agents;

-- Read: legacy unassigned agents remain owner-only; organization-owned agents
-- are readable by any active member carrying the canonical agent.view plane.
-- `is_org_member` is status-aware and derives authority from org_memberships.
CREATE POLICY agents_select_authorized
  ON public.agents FOR SELECT TO authenticated
  USING (
    (org_id IS NULL AND owner_id = auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()))
  );

-- Insert: after the BEFORE INSERT compatibility stamp, platform-only/legacy
-- users with no active organization may retain null org ownership. Tenant rows
-- must be bound to the active organization and require a canonical writer role.
CREATE POLICY agents_insert_authorized
  ON public.agents FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      (org_id IS NULL AND public.active_org_id() IS NULL)
      OR (
        org_id IS NOT NULL
        AND org_id = public.active_org_id()
        AND public.org_has_role(
          org_id,
          auth.uid(),
          ARRAY['owner','admin','operator','engineer','manager']::text[]
        )
      )
    )
  );

-- Update: preserve owner-only access for legacy null-org rows. Organization
-- rows use the canonical tenant writer set; read-oriented roles cannot mutate.
CREATE POLICY agents_update_authorized
  ON public.agents FOR UPDATE TO authenticated
  USING (
    (org_id IS NULL AND owner_id = auth.uid())
    OR (
      org_id IS NOT NULL
      AND public.org_has_role(
        org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager']::text[]
      )
    )
  )
  WITH CHECK (
    (org_id IS NULL AND owner_id = auth.uid())
    OR (
      org_id IS NOT NULL
      AND public.org_has_role(
        org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager']::text[]
      )
    )
  );

-- Delete is intentionally narrower than update and matches tenant twin-delete
-- authority: organization owner/admin only, or the owner of a legacy null-org row.
CREATE POLICY agents_delete_authorized
  ON public.agents FOR DELETE TO authenticated
  USING (
    (org_id IS NULL AND owner_id = auth.uid())
    OR (
      org_id IS NOT NULL
      AND public.org_has_role(
        org_id,
        auth.uid(),
        ARRAY['owner','admin']::text[]
      )
    )
  );

-- Prevent an authenticated writer who belongs to multiple organizations from
-- moving an existing agent between tenants. Service/privileged maintenance is
-- deliberately outside this user-request trigger boundary.
DROP TRIGGER IF EXISTS agents_lock_org ON public.agents;
CREATE TRIGGER agents_lock_org
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.prevent_org_id_reassignment();

COMMIT;
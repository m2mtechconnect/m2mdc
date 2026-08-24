BEGIN;

-- Canonicalize public.agents tenancy against org_memberships.
--
-- The legacy org SELECT policy used profiles.org_id, which is a compatibility
-- pointer rather than the authoritative membership source. Builder reads now
-- intentionally rely on agents RLS, so the table policy must use the same
-- active membership model as the rest of the enterprise tenancy plane.

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

-- Insert: platform-only/legacy users with no active organization may continue
-- creating owner-only rows. Once a caller has an active organization, the row
-- must be bound to that exact org and the caller must hold a tenant writer role.
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

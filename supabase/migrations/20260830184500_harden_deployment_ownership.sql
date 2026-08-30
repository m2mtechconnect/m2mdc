BEGIN;

-- Deployment evidence belongs to the organization that owns the referenced
-- agent. Legacy agents without an organization remain owner-scoped during the
-- tenancy migration; no browser-supplied organization id is trusted.
ALTER TABLE public.deployments
  ADD COLUMN IF NOT EXISTS org_id uuid;

UPDATE public.deployments d
SET org_id = a.org_id
FROM public.agents a
WHERE a.id = d.system_id
  AND d.org_id IS NULL;

-- Fail closed instead of silently accepting orphan evidence. These checks also
-- make a race between the read-only audit and migration application visible.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.deployments d
    LEFT JOIN public.agents a ON a.id = d.system_id
    WHERE a.id IS NULL
  ) THEN
    RAISE EXCEPTION 'deployment ownership migration blocked: orphan system_id exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.deployments
    WHERE deployed_by IS NULL
  ) THEN
    RAISE EXCEPTION 'deployment ownership migration blocked: deployed_by is null';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.deployment_events e
    LEFT JOIN public.deployments d ON d.id = e.deployment_id
    WHERE d.id IS NULL
       OR e.system_id IS DISTINCT FROM d.system_id
  ) THEN
    RAISE EXCEPTION 'deployment ownership migration blocked: deployment event parent mismatch exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.deployment_events
    WHERE actor_id IS NULL
  ) THEN
    RAISE EXCEPTION 'deployment ownership migration blocked: deployment event actor_id is null';
  END IF;
END;
$$;

ALTER TABLE public.deployments
  ALTER COLUMN deployed_by SET NOT NULL;

ALTER TABLE public.deployment_events
  ALTER COLUMN actor_id SET NOT NULL;

ALTER TABLE public.deployments
  ADD CONSTRAINT deployments_system_id_fkey
  FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.deployments
  ADD CONSTRAINT deployments_deployed_by_fkey
  FOREIGN KEY (deployed_by) REFERENCES auth.users(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.deployments
  ADD CONSTRAINT deployments_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.deployment_events
  ADD CONSTRAINT deployment_events_system_id_fkey
  FOREIGN KEY (system_id) REFERENCES public.agents(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.deployment_events
  ADD CONSTRAINT deployment_events_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.deployments VALIDATE CONSTRAINT deployments_system_id_fkey;
ALTER TABLE public.deployments VALIDATE CONSTRAINT deployments_deployed_by_fkey;
ALTER TABLE public.deployments VALIDATE CONSTRAINT deployments_org_id_fkey;
ALTER TABLE public.deployment_events VALIDATE CONSTRAINT deployment_events_system_id_fkey;
ALTER TABLE public.deployment_events VALIDATE CONSTRAINT deployment_events_actor_id_fkey;

CREATE INDEX IF NOT EXISTS idx_deployments_org_created
  ON public.deployments (org_id, created_at DESC);

-- Derive deployment scope and actor from server-visible authority. For current
-- organization-owned agents, the active organization and an execution-capable
-- membership are mandatory. Legacy null-org agents retain owner-only behavior
-- until their separate tenancy backfill is complete.
CREATE OR REPLACE FUNCTION public.stamp_deployment_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_agent_org_id uuid;
  v_agent_owner_id uuid;
  v_active_org_id uuid;
BEGIN
  SELECT a.org_id, a.owner_id
  INTO v_agent_org_id, v_agent_owner_id
  FROM public.agents a
  WHERE a.id = NEW.system_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deployment system does not exist';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    NEW.deployed_by := auth.uid();

    IF v_agent_org_id IS NULL THEN
      IF v_agent_owner_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'legacy deployment requires system ownership';
      END IF;
      NEW.org_id := NULL;
      RETURN NEW;
    END IF;

    v_active_org_id := public.active_org_id();
    IF v_active_org_id IS NULL OR v_active_org_id IS DISTINCT FROM v_agent_org_id THEN
      RAISE EXCEPTION 'deployment system must belong to the active organization';
    END IF;

    IF NOT public.org_has_role(
      v_agent_org_id,
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    ) THEN
      RAISE EXCEPTION 'organization role cannot execute deployments';
    END IF;
  END IF;

  NEW.org_id := v_agent_org_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_deployment_authority() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS deployments_stamp_authority ON public.deployments;
CREATE TRIGGER deployments_stamp_authority
BEFORE INSERT ON public.deployments
FOR EACH ROW EXECUTE FUNCTION public.stamp_deployment_authority();

CREATE OR REPLACE FUNCTION public.prevent_deployment_authority_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.system_id IS DISTINCT FROM NEW.system_id
     OR OLD.org_id IS DISTINCT FROM NEW.org_id
     OR OLD.deployed_by IS DISTINCT FROM NEW.deployed_by THEN
    RAISE EXCEPTION 'deployment authority fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_deployment_authority_reassignment() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS deployments_lock_authority ON public.deployments;
CREATE TRIGGER deployments_lock_authority
BEFORE UPDATE ON public.deployments
FOR EACH ROW EXECUTE FUNCTION public.prevent_deployment_authority_reassignment();

-- Event system and actor fields are evidence derived from the parent deployment
-- and authenticated request, never independent client assertions.
CREATE OR REPLACE FUNCTION public.stamp_deployment_event_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_system_id uuid;
BEGIN
  SELECT d.system_id
  INTO v_system_id
  FROM public.deployments d
  WHERE d.id = NEW.deployment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deployment event parent does not exist or is not visible';
  END IF;

  NEW.system_id := v_system_id;
  IF auth.uid() IS NOT NULL THEN
    NEW.actor_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_deployment_event_authority() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS deployment_events_stamp_authority ON public.deployment_events;
CREATE TRIGGER deployment_events_stamp_authority
BEFORE INSERT ON public.deployment_events
FOR EACH ROW EXECUTE FUNCTION public.stamp_deployment_event_authority();

-- Remove legacy user-owned policies and align the database with the canonical
-- organization permission plane. Null-org compatibility rows remain owner-only.
DROP POLICY IF EXISTS "Users can create deployments for their own agents" ON public.deployments;
DROP POLICY IF EXISTS "Users can update their own deployments" ON public.deployments;
DROP POLICY IF EXISTS "Users can view their own deployments" ON public.deployments;

CREATE POLICY deployments_select_authorized
ON public.deployments FOR SELECT TO authenticated
USING (
  (deployments.org_id IS NULL AND deployments.deployed_by = auth.uid())
  OR (
    deployments.org_id IS NOT NULL
    AND deployments.org_id = public.active_org_id()
    AND public.is_org_member(deployments.org_id, auth.uid())
  )
);

CREATE POLICY deployments_insert_authorized
ON public.deployments FOR INSERT TO authenticated
WITH CHECK (
  deployments.deployed_by = auth.uid()
  AND (
    (
      deployments.org_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id = deployments.system_id
          AND a.org_id IS NULL
          AND a.owner_id = auth.uid()
      )
    )
    OR (
      deployments.org_id IS NOT NULL
      AND deployments.org_id = public.active_org_id()
      AND public.org_has_role(
        deployments.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager']::text[]
      )
      AND EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id = deployments.system_id
          AND a.org_id = deployments.org_id
      )
    )
  )
);

CREATE POLICY deployments_update_authorized
ON public.deployments FOR UPDATE TO authenticated
USING (
  deployments.deployed_by = auth.uid()
  AND (
    deployments.org_id IS NULL
    OR (
      deployments.org_id = public.active_org_id()
      AND public.org_has_role(
        deployments.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager']::text[]
      )
    )
  )
)
WITH CHECK (
  deployments.deployed_by = auth.uid()
  AND (
    deployments.org_id IS NULL
    OR (
      deployments.org_id = public.active_org_id()
      AND public.org_has_role(
        deployments.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager']::text[]
      )
    )
  )
);

DROP POLICY IF EXISTS "Users view their own deployment events" ON public.deployment_events;
DROP POLICY IF EXISTS "Users append events to their own deployments" ON public.deployment_events;

CREATE POLICY deployment_events_select_authorized
ON public.deployment_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deployments d
    WHERE d.id = deployment_events.deployment_id
      AND (
        (d.org_id IS NULL AND d.deployed_by = auth.uid())
        OR (
          d.org_id IS NOT NULL
          AND d.org_id = public.active_org_id()
          AND public.is_org_member(d.org_id, auth.uid())
        )
      )
  )
);

CREATE POLICY deployment_events_insert_authorized
ON public.deployment_events FOR INSERT TO authenticated
WITH CHECK (
  deployment_events.actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.deployments d
    WHERE d.id = deployment_events.deployment_id
      AND d.deployed_by = auth.uid()
      AND (
        d.org_id IS NULL
        OR (
          d.org_id = public.active_org_id()
          AND public.org_has_role(
            d.org_id,
            auth.uid(),
            ARRAY['owner','admin','operator','engineer','manager']::text[]
          )
        )
      )
  )
);

-- Supabase project default privileges previously left these tables with broader
-- grants than the migration comments claimed. Make the application contract
-- explicit. TRUNCATE is especially unsafe because PostgreSQL does not apply RLS
-- to it.
REVOKE ALL ON public.deployments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deployments TO authenticated;

REVOKE ALL ON public.deployment_events FROM anon, authenticated;
GRANT SELECT, INSERT ON public.deployment_events TO authenticated;

COMMENT ON COLUMN public.deployments.org_id IS
  'Organization inherited from agents.org_id. NULL only for legacy null-org agents during tenancy migration.';
COMMENT ON TABLE public.deployments IS
  'Canonical AURA configuration activation state. Organization scoped when the referenced agent is organization owned.';
COMMENT ON TABLE public.deployment_events IS
  'Immutable append-only deployment step evidence. Authenticated clients have SELECT/INSERT only; authority derives from the parent deployment.';

COMMIT;

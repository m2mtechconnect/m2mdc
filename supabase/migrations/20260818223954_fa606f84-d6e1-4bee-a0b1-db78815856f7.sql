ALTER TABLE public.agent_definitions ADD COLUMN IF NOT EXISTS org_id uuid;
CREATE INDEX IF NOT EXISTS agent_definitions_org_id_idx ON public.agent_definitions (org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_definitions TO authenticated;
GRANT ALL ON public.agent_definitions TO service_role;

DROP POLICY IF EXISTS "Users can create agents" ON public.agent_definitions;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agent_definitions;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agent_definitions;
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agent_definitions;
DROP POLICY IF EXISTS "Signed-in users can view system default agents" ON public.agent_definitions;
DROP POLICY IF EXISTS "agent_definitions_select" ON public.agent_definitions;

CREATE POLICY "agent_definitions_select"
ON public.agent_definitions
FOR SELECT
TO authenticated
USING (
  is_system_default = true
  OR auth.uid() = owner_id
  OR (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.org_id IS NOT NULL
        AND p.org_id = agent_definitions.org_id
    )
  )
);

CREATE POLICY "agent_definitions_insert_own"
ON public.agent_definitions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id AND is_system_default = false);

CREATE POLICY "agent_definitions_update_own"
ON public.agent_definitions
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id AND is_system_default = false)
WITH CHECK (auth.uid() = owner_id AND is_system_default = false);

CREATE POLICY "agent_definitions_delete_own"
ON public.agent_definitions
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id AND is_system_default = false);
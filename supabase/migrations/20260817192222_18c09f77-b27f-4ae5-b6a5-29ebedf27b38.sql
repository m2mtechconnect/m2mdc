ALTER TABLE public.connection_instances
  ADD COLUMN IF NOT EXISTS binding_class text NOT NULL DEFAULT 'AURA_NATIVE',
  ADD COLUMN IF NOT EXISTS platform_binding_state text NOT NULL DEFAULT 'NOT_LINKED',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS disclosure_limitations text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.connection_instances
  DROP CONSTRAINT IF EXISTS connection_instances_binding_class_check;
ALTER TABLE public.connection_instances
  ADD CONSTRAINT connection_instances_binding_class_check
  CHECK (binding_class IN ('MANAGED_SHARED','MANAGED_USER','AURA_NATIVE','EXTERNAL_DSX_RUNTIME'));

CREATE TABLE IF NOT EXISTS public.managed_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  connector_definition_id text NOT NULL,
  binding_class text NOT NULL DEFAULT 'MANAGED_USER',
  status text NOT NULL DEFAULT 'AWAITING_USER_AUTHORIZATION',
  granted_scopes text[] NOT NULL DEFAULT '{}',
  provider_account_label text,
  consented_at timestamptz,
  last_success_at timestamptz,
  revoked_at timestamptz,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_definition_id)
);

GRANT SELECT, UPDATE ON public.managed_user_connections TO authenticated;
GRANT ALL ON public.managed_user_connections TO service_role;
ALTER TABLE public.managed_user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own managed user connections readable" ON public.managed_user_connections;
CREATE POLICY "own managed user connections readable"
  ON public.managed_user_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own managed user connections revocable" ON public.managed_user_connections;
CREATE POLICY "own managed user connections revocable"
  ON public.managed_user_connections FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.managed_connector_write_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  tenant_id uuid,
  operation_id text NOT NULL,
  requested_by uuid,
  approved_by uuid,
  status text NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.managed_connector_write_approvals TO authenticated;
GRANT ALL ON public.managed_connector_write_approvals TO service_role;
ALTER TABLE public.managed_connector_write_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant scoped approvals readable" ON public.managed_connector_write_approvals;
CREATE POLICY "tenant scoped approvals readable"
  ON public.managed_connector_write_approvals FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.managed_connector_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.connection_instances(id) ON DELETE SET NULL,
  tenant_id uuid,
  actor_id uuid,
  operation_id text NOT NULL,
  decision text NOT NULL,
  reason_code text,
  latency_ms integer,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.managed_connector_invocations TO authenticated;
GRANT ALL ON public.managed_connector_invocations TO service_role;
ALTER TABLE public.managed_connector_invocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant scoped invocations readable" ON public.managed_connector_invocations;
CREATE POLICY "tenant scoped invocations readable"
  ON public.managed_connector_invocations FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS managed_connector_invocations_conn_idx
  ON public.managed_connector_invocations (connection_id, created_at DESC);
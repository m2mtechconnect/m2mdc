CREATE TABLE public.connection_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL UNIQUE REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  tenant_id uuid,
  auth_method text NOT NULL,
  ciphertext text NOT NULL,
  fingerprint text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ACTIVE',
  expires_at timestamptz,
  last_rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.connection_credentials TO service_role;
ALTER TABLE public.connection_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credential material is backend-only"
  ON public.connection_credentials FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE TABLE public.connection_credential_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connection_instances(id) ON DELETE CASCADE,
  tenant_id uuid,
  action text NOT NULL,
  version integer NOT NULL,
  fingerprint text,
  actor_id uuid,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.connection_credential_events TO service_role;
ALTER TABLE public.connection_credential_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credential history is backend-only"
  ON public.connection_credential_events FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX idx_connection_credential_events_connection
  ON public.connection_credential_events (connection_id, created_at DESC);

CREATE TRIGGER update_connection_credentials_updated_at
  BEFORE UPDATE ON public.connection_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
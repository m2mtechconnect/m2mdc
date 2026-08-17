CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_user_connections_no_client_access" ON public.app_user_connections;
CREATE POLICY "app_user_connections_no_client_access"
ON public.app_user_connections FOR ALL TO authenticated
USING (false) WITH CHECK (false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_user_connections_user_connector_key'
  ) THEN
    ALTER TABLE public.managed_user_connections
      ADD CONSTRAINT managed_user_connections_user_connector_key
      UNIQUE (user_id, connector_definition_id);
  END IF;
END $$;
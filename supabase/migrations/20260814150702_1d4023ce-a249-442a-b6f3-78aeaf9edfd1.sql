CREATE TABLE public.asset_gpu_validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  asset_checksum text NOT NULL,
  scenario_id text NOT NULL,
  manifest_version integer,
  app_version text,
  validated_at timestamptz NOT NULL DEFAULT now(),
  validated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renderer jsonb NOT NULL DEFAULT '{}'::jsonb,
  benchmark_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery jsonb NOT NULL DEFAULT '{}'::jsonb,
  performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  acceptance_result text NOT NULL CHECK (acceptance_result IN ('pass','warning','fail','invalid')),
  verdict text NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  screenshot_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.asset_gpu_validation_runs IS 'Administrator-run hardware GPU acceptance results for approved 3D asset derivatives. No IP addresses or hardware fingerprints are stored.';

GRANT SELECT, INSERT ON public.asset_gpu_validation_runs TO authenticated;
GRANT ALL ON public.asset_gpu_validation_runs TO service_role;

ALTER TABLE public.asset_gpu_validation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read asset gpu validation runs"
  ON public.asset_gpu_validation_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins insert their own asset gpu validation runs"
  ON public.asset_gpu_validation_runs FOR INSERT TO authenticated
  WITH CHECK (
    validated_by = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  );

CREATE INDEX idx_asset_gpu_validation_runs_asset ON public.asset_gpu_validation_runs (asset_id, validated_at DESC);
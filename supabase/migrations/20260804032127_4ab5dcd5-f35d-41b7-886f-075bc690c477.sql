-- Scope profile-image listing to the owner's own folder (public links still work)
DROP POLICY IF EXISTS "Profile images are publicly readable" ON storage.objects;
CREATE POLICY "Users can list their own profile images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- KPI aggregation routines should respect the caller's own row-level access
ALTER FUNCTION public.rpc_kpi_agents_deployed(timestamptz, timestamptz, uuid) SECURITY INVOKER;
ALTER FUNCTION public.rpc_kpi_compliance_accuracy(timestamptz, timestamptz, uuid) SECURITY INVOKER;
ALTER FUNCTION public.rpc_kpi_roi_growth(timestamptz, timestamptz, uuid) SECURITY INVOKER;
ALTER FUNCTION public.rpc_kpi_time_saved(timestamptz, timestamptz, uuid) SECURITY INVOKER;
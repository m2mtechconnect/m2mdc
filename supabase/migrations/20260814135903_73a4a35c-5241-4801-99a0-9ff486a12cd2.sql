
CREATE TABLE public.asset_canary_events (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  asset_version text not null,
  glb_checksum text,
  scope text not null,
  action text not null check (action in ('mount','rollback')),
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.asset_canary_events TO authenticated;
GRANT INSERT ON public.asset_canary_events TO authenticated;
GRANT ALL ON public.asset_canary_events TO service_role;

ALTER TABLE public.asset_canary_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read canary history"
ON public.asset_canary_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can record canary events"
ON public.asset_canary_events FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);

CREATE POLICY "Authenticated users can read published twin derivatives"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'digital-twin-assets'
  AND (storage.foldername(name))[array_length(storage.foldername(name),1)] = 'web'
);

CREATE POLICY "Admins can read twin asset source packages"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'digital-twin-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);

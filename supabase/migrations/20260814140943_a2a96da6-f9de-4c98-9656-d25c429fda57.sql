
INSERT INTO public.asset_canary_events (asset_id, asset_version, glb_checksum, scope, action, reason, actor_id)
SELECT
  'nvidia.rack.42u_a_01',
  '1.0.0',
  'sha256:7ec75623ddd3cb910d798c5691f338ed45fe4056ddaae139314f9bd456290712',
  'single-rack-canary',
  'mount',
  'Approved publication of Rack_42U_A_01 from NVIDIA Data Center OpenUSD Assets Pack (Datacenter_NVD@10012). Source and derivative published to digital-twin-assets/nvidia/rack_42u_a/v1/.',
  source_user.id
FROM auth.users AS source_user
WHERE source_user.id = 'd309b3bd-88ca-4dc9-b007-c411787b848a'::uuid;

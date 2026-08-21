#!/usr/bin/env node
/**
 * Ephemeral clean-replay compatibility overlay.
 *
 * Some legacy migrations contain environment-specific seed rows or assume
 * policies do not already exist. Those historical files are immutable. For a
 * disposable CI database only, this script applies narrowly-scoped overlays to
 * the WORKTREE after the immutability gate has passed. Nothing produced here is
 * a deployable migration and the script refuses to run without an explicit CI
 * opt-in.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (!process.argv.includes('--ephemeral') || process.env.AURA_REPLAY_EPHEMERAL !== '1') {
  console.error(
    'CLEAN_REPLAY_OVERLAY: REFUSED - requires --ephemeral and AURA_REPLAY_EPHEMERAL=1',
  );
  process.exit(1);
}

const root = 'supabase/migrations';

function replaceExact(file, before, after) {
  const path = join(root, file);
  const source = readFileSync(path, 'utf8');
  if (!source.includes(before)) {
    console.error(`CLEAN_REPLAY_OVERLAY: FAIL - expected source block not found in ${file}`);
    process.exit(1);
  }
  writeFileSync(path, source.replace(before, after));
  console.log(`CLEAN_REPLAY_OVERLAY: patched ${file}`);
}

replaceExact(
  '20260218142636_a59bb8cb-5e00-4e13-b63d-19eb97d7d4bb.sql',
  `-- Also backfill the missing profile for dami@m2mtechconnect.com\nINSERT INTO public.profiles (user_id, email, full_name, is_approved, avatar_bg_color, avatar_initials)\nVALUES (\n  'dc4ffd38-7474-4ece-a76d-9203538687ed',\n  'dami@m2mtechconnect.com',\n  '',\n  false,\n  public.generate_avatar_color('dc4ffd38-7474-4ece-a76d-9203538687ed'::uuid),\n  public.generate_initials('', 'dami@m2mtechconnect.com')\n)\nON CONFLICT (user_id) DO NOTHING;`,
  `-- Replay-only guard: do not fabricate source-environment auth identities.\nINSERT INTO public.profiles (user_id, email, full_name, is_approved, avatar_bg_color, avatar_initials)\nSELECT\n  source_user.id,\n  'dami@m2mtechconnect.com',\n  '',\n  false,\n  public.generate_avatar_color(source_user.id),\n  public.generate_initials('', 'dami@m2mtechconnect.com')\nFROM auth.users AS source_user\nWHERE source_user.id = 'dc4ffd38-7474-4ece-a76d-9203538687ed'::uuid\nON CONFLICT (user_id) DO NOTHING;`,
);

replaceExact(
  '20260731185028_01b5764d-1ffd-480a-a835-acc0b51997fd.sql',
  `INSERT INTO public.user_roles (user_id, role)\nSELECT 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid, 'admin'\nWHERE NOT EXISTS (\n  SELECT 1 FROM public.user_roles WHERE user_id = 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid\n);`,
  `INSERT INTO public.user_roles (user_id, role)\nSELECT source_user.id, 'admin'\nFROM auth.users AS source_user\nWHERE source_user.id = 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid\nAND NOT EXISTS (\n  SELECT 1 FROM public.user_roles WHERE user_id = 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid\n);`,
);

replaceExact(
  '20260804032127_4ab5dcd5-f35d-41b7-886f-075bc690c477.sql',
  `DROP POLICY IF EXISTS "Profile images are publicly readable" ON storage.objects;\nCREATE POLICY "Users can list their own profile images"`,
  `DROP POLICY IF EXISTS "Profile images are publicly readable" ON storage.objects;\nDROP POLICY IF EXISTS "Users can list their own profile images" ON storage.objects;\nCREATE POLICY "Users can list their own profile images"`,
);

replaceExact(
  '20260814135903_73a4a35c-5241-4801-99a0-9ff486a12cd2.sql',
  `CREATE POLICY "Authenticated users can read published twin derivatives"`,
  `DROP POLICY IF EXISTS "Authenticated users can read published twin derivatives" ON storage.objects;\nCREATE POLICY "Authenticated users can read published twin derivatives"`,
);
replaceExact(
  '20260814135903_73a4a35c-5241-4801-99a0-9ff486a12cd2.sql',
  `CREATE POLICY "Admins can read twin asset source packages"`,
  `DROP POLICY IF EXISTS "Admins can read twin asset source packages" ON storage.objects;\nCREATE POLICY "Admins can read twin asset source packages"`,
);

replaceExact(
  '20260814140943_a2a96da6-f9de-4c98-9656-d25c429fda57.sql',
  `INSERT INTO public.asset_canary_events (asset_id, asset_version, glb_checksum, scope, action, reason, actor_id)\nVALUES (\n  'nvidia.rack.42u_a_01',\n  '1.0.0',\n  'sha256:7ec75623ddd3cb910d798c5691f338ed45fe4056ddaae139314f9bd456290712',\n  'single-rack-canary',\n  'mount',\n  'Approved publication of Rack_42U_A_01 from NVIDIA Data Center OpenUSD Assets Pack (Datacenter_NVD@10012). Source and derivative published to digital-twin-assets/nvidia/rack_42u_a/v1/.',\n  'd309b3bd-88ca-4dc9-b007-c411787b848a'\n);`,
  `INSERT INTO public.asset_canary_events (asset_id, asset_version, glb_checksum, scope, action, reason, actor_id)\nSELECT\n  'nvidia.rack.42u_a_01',\n  '1.0.0',\n  'sha256:7ec75623ddd3cb910d798c5691f338ed45fe4056ddaae139314f9bd456290712',\n  'single-rack-canary',\n  'mount',\n  'Approved publication of Rack_42U_A_01 from NVIDIA Data Center OpenUSD Assets Pack (Datacenter_NVD@10012). Source and derivative published to digital-twin-assets/nvidia/rack_42u_a/v1/.',\n  source_user.id\nFROM auth.users AS source_user\nWHERE source_user.id = 'd309b3bd-88ca-4dc9-b007-c411787b848a'::uuid;`,
);

const bridge = join(root, '20260206150807_restore_public_search_path.sql');
if (existsSync(bridge)) {
  console.error('CLEAN_REPLAY_OVERLAY: FAIL - search-path bridge is committed; it must be ephemeral only');
  process.exit(1);
}
writeFileSync(
  bridge,
  `-- Ephemeral replay-only bridge. Never commit this as production migration history.\n` +
    `SELECT pg_catalog.set_config('search_path', 'public', false);\n`,
);
console.log('CLEAN_REPLAY_OVERLAY: added ephemeral search-path bridge');
console.log('CLEAN_REPLAY_OVERLAY: PASS');

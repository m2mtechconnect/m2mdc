import { resolveTestSupabaseConfig } from '../helpers/testSupabaseClient';

/**
 * Selects the standard Vitest backend before test modules are imported.
 *
 * Ambient application credentials are deliberately ignored. A remote target
 * is only considered when it is supplied through TEST_SUPABASE_URL, and the
 * shared resolver still rejects it because the standard suite is loopback-only.
 */
export function primeSafeTestEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  const { url, anonKey } = resolveTestSupabaseConfig({
    TEST_SUPABASE_URL: env.TEST_SUPABASE_URL,
    TEST_SUPABASE_ANON_KEY: env.TEST_SUPABASE_ANON_KEY,
  });

  env.TEST_SUPABASE_URL = url;
  env.TEST_SUPABASE_ANON_KEY = anonKey;
  env.VITE_SUPABASE_URL = url;
  env.VITE_SUPABASE_PUBLISHABLE_KEY = anonKey;
  env.SUPABASE_URL = url;
  env.SUPABASE_ANON_KEY = anonKey;

  return { url, anonKey };
}

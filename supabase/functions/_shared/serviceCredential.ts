/**
 * Resolves the server-only Supabase credential used by trusted write
 * boundaries. AURA_SUPABASE_SERVICE_KEY is the neutral, explicit override for
 * runtimes where the managed key or an opaque `sb_secret_...` key cannot be
 * used. Existing deployments retain both compatibility fallbacks.
 */
export function getSupabaseServiceCredential(): string {
  const credential = (
    Deno.env.get('AURA_SUPABASE_SERVICE_KEY')
    ?? Deno.env.get('AURA_SUPABASE_SECRET_KEY')
    ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? ''
  ).trim();
  const anonKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim();

  if (!credential) throw new Error('Supabase service credential is not configured');
  if (anonKey && credential === anonKey) {
    throw new Error('Supabase service credential must not use the anonymous key');
  }
  return credential;
}

export function getSupabaseServiceCredentialKind(): 'secret' | 'legacy-jwt' | 'other' {
  const credential = getSupabaseServiceCredential();
  if (credential.startsWith('sb_secret_')) return 'secret';
  if (credential.split('.').length === 3) return 'legacy-jwt';
  return 'other';
}

export const SUPABASE_SERVICE_CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

export function createSupabaseServiceClient() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const credential = getSupabaseServiceCredential();
  if (!url) throw new Error('Supabase URL is not configured');

  const serviceFetch: typeof fetch = (input, init = {}) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (credential.startsWith('sb_secret_')) headers.delete('Authorization');
    if (input instanceof Request) {
      return fetch(new Request(input, { ...init, headers }));
    }
    return fetch(input, { ...init, headers });
  };

  return createClient(url, credential, {
    ...SUPABASE_SERVICE_CLIENT_OPTIONS,
    global: { fetch: serviceFetch },
  });
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

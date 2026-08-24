/**
 * SSO provider availability and handlers.
 *
 * Truth rule: only providers actually configured on the backend are offered.
 * Unconfigured providers are rendered disabled with an explicit reason - never
 * as a working-looking button that emits a "coming soon" toast.
 */

import { supabase } from '@/integrations/supabase/client';
import { safeReturnPath } from '@/routing/AuthenticatedEntryRedirect';

export type SSOProviderId = 'google' | 'microsoft' | 'enterprise';

export interface SSOProviderStatus {
  id: SSOProviderId;
  label: string;
  available: boolean;
  /** Shown to the user when the provider is not available. */
  unavailableReason?: string;
}

export const SSO_PROVIDERS: Record<SSOProviderId, SSOProviderStatus> = {
  google: {
    id: 'google',
    label: 'Google',
    available: true,
  },
  microsoft: {
    id: 'microsoft',
    label: 'Microsoft',
    available: false,
    unavailableReason: 'Microsoft sign-in is not configured for this tenant.',
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise SSO',
    available: false,
    unavailableReason: 'SAML enterprise SSO is not configured for this tenant.',
  },
};

/**
 * Same-origin OAuth callback target. A validated in-app return path is carried
 * as callback state so protected deep links survive the external OAuth round
 * trip without introducing an open redirect.
 */
export function ssoRedirectUrl(returnTo?: string | null): string {
  const callback = new URL('/auth/callback', window.location.origin);
  const safe = safeReturnPath(returnTo ?? null);
  if (safe) callback.searchParams.set('returnTo', safe);
  return callback.toString();
}

export async function signInWithGoogle(returnTo?: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: ssoRedirectUrl(returnTo),
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  return { error: error ? error.message : null };
}

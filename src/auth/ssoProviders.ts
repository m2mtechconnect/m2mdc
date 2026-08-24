/**
 * SSO provider availability and handlers.
 *
 * Truth rule: only providers actually configured on the backend are offered.
 * Unconfigured providers are rendered disabled with an explicit reason - never
 * as a working-looking button that emits a "coming soon" toast.
 */

import { supabase } from '@/integrations/supabase/client';
import { stashReturnPath } from '@/auth/returnPathHandoff';

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

/** Same-origin callback target for OAuth redirects. */
export function ssoRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * Start Google SSO. `returnTo` is sanitized and stashed same-origin so a
 * protected deep link (including its query and hash) survives the provider
 * round trip and is restored by `/auth/callback`.
 */
export async function signInWithGoogle(returnTo?: string | null): Promise<{ error: string | null }> {
  stashReturnPath(returnTo ?? null);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: ssoRedirectUrl(),
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  return { error: error ? error.message : null };
}


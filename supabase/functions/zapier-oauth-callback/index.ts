import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders } from '../_shared/cors.ts';

// This handler is an OAuth redirect target reached by top-level browser
// navigation, so CORS is not its security boundary; the one-time `state` token
// is. The headers are still scoped rather than wildcard for consistency.
const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Where the browser is sent after the exchange. Overridable per environment.
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://auradc.m2mtechconnect.com').replace(/\/$/, '');
const MAX_OAUTH_PARAMETER_LENGTH = 4096;

type SafeOAuthErrorCode =
  | 'invalid_oauth_callback'
  | 'invalid_oauth_state'
  | 'oauth_configuration_error'
  | 'oauth_exchange_failed'
  | 'oauth_credential_store_failed'
  | 'oauth_connection_store_failed';

class OAuthCallbackError extends Error {
  constructor(public readonly safeCode: SafeOAuthErrorCode, internalMessage: string) {
    super(internalMessage);
    this.name = 'OAuthCallbackError';
  }
}

serve(async (req) => {
  // Edge isolates can interleave async requests, so request-derived headers
  // must never be stored in module-level mutable state.
  const corsHeaders = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
  const correlationId = crypto.randomUUID();

  const redirectFailure = (code: SafeOAuthErrorCode) =>
    new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${APP_BASE_URL}/integrations?error=${encodeURIComponent(code)}&correlation_id=${encodeURIComponent(correlationId)}`,
      },
    });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new OAuthCallbackError('oauth_configuration_error', 'Supabase service configuration is missing');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    const stateToken = url.searchParams.get('state') ?? '';

    if (
      !code ||
      !stateToken ||
      code.length > MAX_OAUTH_PARAMETER_LENGTH ||
      stateToken.length > MAX_OAUTH_PARAMETER_LENGTH
    ) {
      throw new OAuthCallbackError('invalid_oauth_callback', 'OAuth callback parameters are missing or oversized');
    }

    // SECURITY: consume the one-time state atomically. The RPC is service-role
    // only and performs UPDATE ... WHERE used=false AND expires_at>now()
    // RETURNING, so concurrent callbacks cannot both claim the same state.
    const { data: consumedStates, error: stateError } = await supabase.rpc(
      'consume_zapier_oauth_state',
      { p_state_token: stateToken },
    );
    const stateRecord = Array.isArray(consumedStates) ? consumedStates[0] : null;

    if (stateError || !stateRecord) {
      console.warn(`[zapier-oauth-callback] state_rejected correlation_id=${correlationId}`);
      throw new OAuthCallbackError('invalid_oauth_state', 'OAuth state was invalid, expired, or already consumed');
    }

    const { user_id, system_id, app_id } = stateRecord as {
      user_id: string;
      system_id: string | null;
      app_id: string;
    };

    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');
    const zapierClientSecret = Deno.env.get('ZAPIER_CLIENT_SECRET');
    // Derived from this deployment rather than hardcoded to a foreign project.
    const zapierRedirectUri = Deno.env.get('ZAPIER_REDIRECT_URI') ||
      `${supabaseUrl.replace(/\/$/, '')}/functions/v1/zapier-oauth-callback`;

    if (!zapierClientId || !zapierClientSecret) {
      throw new OAuthCallbackError('oauth_configuration_error', 'Zapier credentials are not configured');
    }

    const tokenResponse = await fetch('https://zapier.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: zapierClientId,
        client_secret: zapierClientSecret,
        redirect_uri: zapierRedirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error(
        `[zapier-oauth-callback] exchange_failed correlation_id=${correlationId} status=${tokenResponse.status}`,
      );
      throw new OAuthCallbackError('oauth_exchange_failed', 'Zapier token exchange failed');
    }

    const tokens = await tokenResponse.json() as {
      access_token?: unknown;
      refresh_token?: unknown;
      scope?: unknown;
      expires_in?: unknown;
    };
    const accessToken = typeof tokens.access_token === 'string' ? tokens.access_token : '';
    const refreshToken = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : '';
    const scope = typeof tokens.scope === 'string' ? tokens.scope : null;
    const expiresIn = typeof tokens.expires_in === 'number' && Number.isFinite(tokens.expires_in)
      ? tokens.expires_in
      : 3600;

    if (!accessToken || !refreshToken) {
      throw new OAuthCallbackError('oauth_exchange_failed', 'Zapier token response was incomplete');
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // SECURITY: Store tokens in Vault and persist only Vault references.
    const vaultAccessTokenName = `zapier_access_${user_id}_${app_id}`;
    const vaultRefreshTokenName = `zapier_refresh_${user_id}_${app_id}`;

    const { data: vaultAccessId, error: vaultAccessError } = await supabase
      .rpc('store_secret_in_vault', {
        secret_name: vaultAccessTokenName,
        secret_value: accessToken,
      });

    if (vaultAccessError || !vaultAccessId) {
      console.error(`[zapier-oauth-callback] vault_access_store_failed correlation_id=${correlationId}`);
      throw new OAuthCallbackError('oauth_credential_store_failed', 'Failed to store access token securely');
    }

    const { data: vaultRefreshId, error: vaultRefreshError } = await supabase
      .rpc('store_secret_in_vault', {
        secret_name: vaultRefreshTokenName,
        secret_value: refreshToken,
      });

    if (vaultRefreshError || !vaultRefreshId) {
      console.error(`[zapier-oauth-callback] vault_refresh_store_failed correlation_id=${correlationId}`);
      throw new OAuthCallbackError('oauth_credential_store_failed', 'Failed to store refresh token securely');
    }

    const { error: upsertError } = await supabase
      .from('integrations_tokens')
      .upsert({
        user_id,
        app_id,
        access_token: null,
        refresh_token: null,
        vault_access_token_id: vaultAccessId,
        vault_refresh_token_id: vaultRefreshId,
        scope,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        metadata: {
          system_id,
          connected_at: new Date().toISOString(),
        },
      }, {
        onConflict: 'user_id,app_id',
      });

    if (upsertError) {
      console.error(`[zapier-oauth-callback] connection_store_failed correlation_id=${correlationId}`);
      throw new OAuthCallbackError('oauth_connection_store_failed', 'Failed to store integration connection');
    }

    const { error: logError } = await supabase.from('integration_sync_logs').insert({
      user_id,
      app_id,
      sync_type: 'connect',
      status: 'success',
      records_synced: 0,
      metadata: { system_id, correlation_id: correlationId },
    });
    if (logError) {
      // Connection success is authoritative; audit transport failure must not
      // silently undo or expose credentials. Preserve diagnostics server-side.
      console.error(`[zapier-oauth-callback] audit_log_failed correlation_id=${correlationId}`);
    }

    const redirectUrl = system_id
      ? `${APP_BASE_URL}/builder?id=${encodeURIComponent(system_id)}&step=4&connected=${encodeURIComponent(app_id)}`
      : `${APP_BASE_URL}/integrations?connected=${encodeURIComponent(app_id)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    const safeCode = error instanceof OAuthCallbackError
      ? error.safeCode
      : 'oauth_connection_store_failed';
    const internalReason = error instanceof Error ? error.message : 'unknown';
    console.error(
      `[zapier-oauth-callback] failure correlation_id=${correlationId} code=${safeCode} reason=${internalReason}`,
    );
    return redirectFailure(safeCode);
  }
});

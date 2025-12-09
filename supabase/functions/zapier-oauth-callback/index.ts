import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateToken = url.searchParams.get('state');

    if (!code || !stateToken) {
      throw new Error('Missing code or state parameter');
    }

    // SECURITY: Validate state token server-side
    console.log('Validating OAuth state token...');
    const { data: stateRecord, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state_token', stateToken)
      .eq('used', false)
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid or missing OAuth state:', stateError);
      throw new Error('Invalid or expired OAuth state token');
    }

    // Check if state token has expired
    if (new Date() > new Date(stateRecord.expires_at)) {
      console.error('OAuth state expired:', stateRecord.expires_at);
      throw new Error('OAuth state token has expired');
    }

    // Mark state as used (one-time use only)
    const { error: updateError } = await supabase
      .from('oauth_states')
      .update({ 
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', stateRecord.id);

    if (updateError) {
      console.error('Failed to mark state as used:', updateError);
      throw new Error('OAuth state validation failed');
    }

    // Extract validated data from state record
    const { user_id, system_id, app_id } = stateRecord;
    
    console.log('OAuth state validated successfully:', { 
      user_id, 
      app_id, 
      system_id,
      state_created: stateRecord.created_at,
    });

    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');
    const zapierClientSecret = Deno.env.get('ZAPIER_CLIENT_SECRET');
    const zapierRedirectUri = Deno.env.get('ZAPIER_REDIRECT_URI') || 
      'https://mlhcdcvpvztfjfndmxzl.supabase.co/functions/v1/zapier-oauth-callback';

    if (!zapierClientId || !zapierClientSecret) {
      throw new Error('Zapier credentials not configured');
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens:', { user_id, app_id });
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
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, scope, expires_in } = tokens;

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    // SECURITY: Store tokens in Vault
    console.log('Storing tokens in Vault');
    const vaultAccessTokenName = `zapier_access_${user_id}_${app_id}`;
    const vaultRefreshTokenName = `zapier_refresh_${user_id}_${app_id}`;

    const { data: vaultAccessId, error: vaultAccessError } = await supabase
      .rpc('store_secret_in_vault', {
        secret_name: vaultAccessTokenName,
        secret_value: access_token
      });

    if (vaultAccessError) {
      console.error('Failed to store access token in Vault:', vaultAccessError);
      throw new Error('Failed to secure access token');
    }

    const { data: vaultRefreshId, error: vaultRefreshError } = await supabase
      .rpc('store_secret_in_vault', {
        secret_name: vaultRefreshTokenName,
        secret_value: refresh_token
      });

    if (vaultRefreshError) {
      console.error('Failed to store refresh token in Vault:', vaultRefreshError);
      throw new Error('Failed to secure refresh token');
    }

    // Store vault references (not plaintext tokens)
    const { error: upsertError } = await supabase
      .from('integrations_tokens')
      .upsert({
        user_id,
        app_id,
        access_token: null, // No plaintext storage
        refresh_token: null, // No plaintext storage
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
      console.error('Error storing token references:', upsertError);
      throw upsertError;
    }

    // Log the connection
    await supabase.from('integration_sync_logs').insert({
      user_id,
      app_id,
      sync_type: 'connect',
      status: 'success',
      records_synced: 0,
      metadata: { system_id },
    });

    console.log('OAuth callback success:', { user_id, app_id });

    // Redirect to builder
    const redirectUrl = system_id 
      ? `https://aura.m2mtechconnect.com/builder?id=${system_id}&step=4&connected=${app_id}`
      : `https://aura.m2mtechconnect.com/integrations?connected=${app_id}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Redirect to error page
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `https://aura.m2mtechconnect.com/integrations?error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});

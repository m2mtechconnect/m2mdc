import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create authenticated client with user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Invalid authentication:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    console.log('Authenticated user refreshing token:', { user_id: user.id, connection_id: connectionId });

    // SECURITY: Get connection details with ownership verification
    // RLS policies will ensure user can only access their own connections
    const { data: connection, error: connError } = await supabase
      .from('integrations_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id) // Explicit ownership check
      .single();

    if (connError || !connection) {
      console.error('Connection not found or access denied:', connError);
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Retrieve refresh token from Vault
    let refreshToken;
    if (connection.vault_refresh_token_id) {
      const { data: vaultToken, error: vaultError } = await supabase
        .rpc('get_secret_from_vault', { vault_id: connection.vault_refresh_token_id });
      
      if (vaultError || !vaultToken) {
        console.error('Failed to retrieve refresh token from Vault:', vaultError);
        throw new Error('Failed to retrieve refresh token');
      }
      refreshToken = vaultToken;
    } else if (connection.refresh_token) {
      // Fallback for legacy plaintext tokens
      console.warn('Using legacy plaintext refresh token');
      refreshToken = connection.refresh_token;
    } else {
      throw new Error('No refresh token available');
    }

    // Check if token is actually expired or expiring soon (within 5 minutes)
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt && expiresAt > fiveMinutesFromNow) {
      console.log('Token still valid, no refresh needed');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Token still valid',
          expires_at: expiresAt.toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call Zapier OAuth token refresh endpoint
    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');
    const zapierClientSecret = Deno.env.get('ZAPIER_CLIENT_SECRET');

    if (!zapierClientId || !zapierClientSecret) {
      throw new Error('Zapier credentials not configured');
    }

    const tokenResponse = await fetch('https://zapier.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: zapierClientId,
        client_secret: zapierClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token refresh failed:', errorData);
      
    // Update connection status to expired
      await supabase
        .from('integrations_connections')
        .update({
          status: 'expired',
          last_error: `Token refresh failed: ${errorData}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', user.id); // Ownership verification

      throw new Error(`Token refresh failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();

    // Calculate new expiration time (typically 3600 seconds)
    const expiresIn = tokenData.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // SECURITY: Update tokens in Vault
    if (connection.vault_access_token_id) {
      await supabase.rpc('update_secret_in_vault', {
        vault_id: connection.vault_access_token_id,
        new_secret_value: tokenData.access_token
      });
    }

    if (connection.vault_refresh_token_id && tokenData.refresh_token) {
      await supabase.rpc('update_secret_in_vault', {
        vault_id: connection.vault_refresh_token_id,
        new_secret_value: tokenData.refresh_token
      });
    }

    // Update connection metadata (no plaintext tokens)
    const { error: updateError } = await supabase
      .from('integrations_connections')
      .update({
        access_token: null, // No plaintext storage
        refresh_token: null, // No plaintext storage
        expires_at: newExpiresAt.toISOString(),
        status: 'connected',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('user_id', user.id); // Ownership verification

    if (updateError) throw updateError;

    console.log('Token refreshed successfully:', {
      connection_id: connectionId,
      expires_at: newExpiresAt.toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: newExpiresAt.toISOString(),
        expires_in: expiresIn,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Refresh failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
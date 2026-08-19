import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCaller, callerRejectedResponse } from "../_shared/callerIdentity.ts";


/**
 * Background function to automatically refresh tokens that are expiring soon
 * Can be called periodically via cron or on-demand
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Phase 2: in-code caller identity. This handler holds a service-role
  // client, so an anonymous caller must never reach its queries.
  let caller;
  try {
    caller = await requireCaller(req);
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;
    throw error;
  }

  try {
    // Phase 2: caller identity is verified above; the service-role client
    // below is only reachable by an authenticated caller.
    console.log('Starting token refresh check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find connections expiring in the next 15 minutes
    const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);

    console.log('Checking for tokens expiring before:', fifteenMinutesFromNow.toISOString());

    const { data: expiringConnections, error: fetchError } = await supabase
      .from('integrations_connections')
      .select('*')
      // Phase 3: scoped to the calling user's own connections.
      .eq('user_id', caller.userId)
      .eq('provider', 'zapier')
      .eq('status', 'connected')
      .not('vault_refresh_token_id', 'is', null) // Check for Vault ID instead
      .lt('expires_at', fifteenMinutesFromNow.toISOString())
      .limit(50); // Process in batches

    if (fetchError) throw fetchError;

    if (!expiringConnections || expiringConnections.length === 0) {
      console.log('No tokens need refreshing');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tokens need refreshing',
          checked: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${expiringConnections.length} tokens to refresh`);

    const refreshResults = {
      total: expiringConnections.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Refresh each token directly using service role
    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');
    const zapierClientSecret = Deno.env.get('ZAPIER_CLIENT_SECRET');

    for (const connection of expiringConnections) {
      try {
        console.log('Auto-refreshing connection:', connection.id);

        // SECURITY: Retrieve refresh token from Vault
        const { data: refreshToken, error: vaultError } = await supabase
          .rpc('get_secret_from_vault', { vault_id: connection.vault_refresh_token_id });

        if (vaultError || !refreshToken) {
          throw new Error('Failed to retrieve refresh token from Vault');
        }

        // Call Zapier OAuth token endpoint
        const tokenResponse = await fetch('https://oauth2.zapier.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: zapierClientId!,
            client_secret: zapierClientSecret!,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token refresh failed: ${tokenResponse.status}`);
        }

        const tokens = await tokenResponse.json();

        // SECURITY: Update tokens in Vault
        await supabase.rpc('update_secret_in_vault', {
          vault_id: connection.vault_access_token_id,
          new_secret_value: tokens.access_token
        });

        if (tokens.refresh_token) {
          await supabase.rpc('update_secret_in_vault', {
            vault_id: connection.vault_refresh_token_id,
            new_secret_value: tokens.refresh_token
          });
        }

        // Update connection metadata (no plaintext tokens)
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        const { error: updateError } = await supabase
          .from('integrations_connections')
          .update({
            access_token: null, // No plaintext storage
            refresh_token: null, // No plaintext storage
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        if (updateError) throw updateError;

        refreshResults.successful++;
        console.log('Successfully refreshed connection:', connection.id);

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        refreshResults.failed++;
        refreshResults.errors.push(`Connection ${connection.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error refreshing connection:', connection.id, err);
      }
    }

    console.log('Auto-refresh completed:', refreshResults);

    return new Response(
      JSON.stringify({
        success: true,
        ...refreshResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auto-refresh error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Auto-refresh failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
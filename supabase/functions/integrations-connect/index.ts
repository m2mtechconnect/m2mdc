import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check if user is executive (admin)
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: hasRole } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'executive' });

    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Executive role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { integrationId, name, category, connectMethod, config, apiKey } = await req.json();
    console.log(`Connecting integration: ${integrationId} via ${connectMethod}`);

    // Validate required fields
    if (!integrationId || !name || !category || !connectMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response;
    let integrationData;

    // Handle different connection methods
    switch (connectMethod) {
      case 'oauth':
        // For OAuth, we would normally redirect to OAuth provider
        // For demo purposes, we'll mark as connected
        integrationData = {
          id: integrationId,
          name,
          provider: integrationId,
          category,
          status: 'connected',
          state: 'connected',
          connect_method: connectMethod,
          config: config || {},
          created_by: user.id,
          last_sync: new Date().toISOString(),
        };
        response = { status: 'connected', message: 'OAuth flow completed' };
        break;

      case 'apikey':
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'API key required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // SECURITY: Store API key in Vault
        const vaultKeyName = `integration_apikey_${user.id}_${integrationId}`;
        const { data: vaultId, error: vaultError } = await supabaseClient
          .rpc('store_secret_in_vault', {
            secret_name: vaultKeyName,
            secret_value: apiKey
          });

        if (vaultError) {
          console.error('Failed to store API key in Vault:', vaultError);
          throw new Error('Failed to secure API key');
        }

        integrationData = {
          id: integrationId,
          name,
          provider: integrationId,
          category,
          status: 'connected',
          state: 'connected',
          connect_method: connectMethod,
          config: config || {},
          credentials: { encrypted: true },
          credentials_encrypted: null, // No plaintext storage
          vault_credentials_id: vaultId, // Vault reference
          created_by: user.id,
          last_sync: new Date().toISOString(),
        };
        response = { status: 'connected', message: 'API key stored securely' };
        break;

      case 'zapier':
        // For Zapier, provide connection URL
        integrationData = {
          id: integrationId,
          name,
          provider: integrationId,
          category,
          status: 'connected',
          state: 'connected',
          connect_method: connectMethod,
          config: config || {},
          created_by: user.id,
          last_sync: new Date().toISOString(),
        };
        response = { 
          status: 'redirect', 
          url: `https://zapier.com/app/connections?app=${integrationId}`,
          message: 'Redirect to Zapier'
        };
        break;

      default:
        throw new Error('Unknown connection method');
    }

    // Upsert integration into database
    const { data: savedIntegration, error: dbError } = await supabaseClient
      .from('integrations')
      .upsert(integrationData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Log the action
    const duration = Date.now() - startTime;
    await supabaseClient
      .from('integration_logs')
      .insert({
        integration_id: savedIntegration.id,
        action: 'connect',
        status: 'success',
        details: { method: connectMethod },
        duration_ms: duration,
        user_id: user.id,
      });

    console.log(`Integration ${integrationId} connected successfully in ${duration}ms`);

    return new Response(
      JSON.stringify({ ...response, integration: savedIntegration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Connect error:', error);
    
    // Log failed attempt if possible
    try {
      const authHeader = req.headers.get('Authorization');
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader! } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (user) {
        await supabaseClient
          .from('integration_logs')
          .insert({
            action: 'connect',
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            duration_ms: duration,
            user_id: user.id,
          });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Connection failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

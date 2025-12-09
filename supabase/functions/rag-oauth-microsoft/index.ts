import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // Microsoft OAuth is OPTIONAL - check if configured
    const MSFT_CLIENT_ID = Deno.env.get('MSFT_CLIENT_ID');
    const MSFT_CLIENT_SECRET = Deno.env.get('MSFT_CLIENT_SECRET');
    const REDIRECT_URI = `${url.origin}/functions/v1/rag-oauth-microsoft?action=callback`;

    if (!MSFT_CLIENT_ID || !MSFT_CLIENT_SECRET) {
      console.warn('[rag-oauth-microsoft] Microsoft OAuth not configured - feature disabled');
      return new Response(JSON.stringify({ 
        error: 'Microsoft OAuth not configured',
        message: 'Microsoft integration is optional. The app works without it.',
        configured: false
      }), {
        status: 200, // Return 200 instead of error since this is optional
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'start') {
      const state = crypto.randomUUID();
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', MSFT_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', 'Files.Read.All offline_access');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ 
        auth_url: authUrl.toString(),
        state
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Authorization failed', { status: 400 });
      }

      const tokenResponse = await fetch(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: MSFT_CLIENT_ID,
            client_secret: MSFT_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        }
      );

      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }

      const tokens = await tokenResponse.json();

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response('Unauthorized', { status: 401 });
      }

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        return new Response('Unauthorized', { status: 401 });
      }

      await supabaseClient
        .from('rag_tokens')
        .insert({
          user_id: user.id,
          system_id: url.searchParams.get('system_id') || crypto.randomUUID(),
          provider: 'microsoft',
          token_encrypted: new TextEncoder().encode(JSON.stringify(tokens))
        });

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Microsoft connected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[rag-oauth-microsoft] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'OAuth failed',
      message: 'Microsoft integration is optional and can be configured later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

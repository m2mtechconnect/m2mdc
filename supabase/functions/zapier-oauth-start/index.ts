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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    // Create authenticated client for user validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const appId = url.searchParams.get('appId');
    const systemId = url.searchParams.get('systemId');

    if (!appId) {
      throw new Error('appId is required');
    }

    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');
    const zapierRedirectUri = Deno.env.get('ZAPIER_REDIRECT_URI') || 
      'https://mlhcdcvpvztfjfndmxzl.supabase.co/functions/v1/zapier-oauth-callback';
    const zapierScopes = Deno.env.get('ZAPIER_SCOPES') || 'apps:read connections:write connections:read';

    if (!zapierClientId) {
      throw new Error('Zapier credentials not configured');
    }

    // SECURITY: Generate cryptographically secure state token
    const stateToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create service role client to bypass RLS for state storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Store state in database for server-side validation
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        state_token: stateToken,
        user_id: user.id,
        system_id: systemId,
        app_id: appId,
        provider: 'zapier',
        expires_at: expiresAt.toISOString(),
        metadata: {
          initiated_at: new Date().toISOString(),
          user_agent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        },
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      throw new Error('Failed to initiate OAuth flow');
    }

    // Build Zapier OAuth URL with secure state token
    const authUrl = new URL('https://zapier.com/oauth/authorize');
    authUrl.searchParams.set('client_id', zapierClientId);
    authUrl.searchParams.set('redirect_uri', zapierRedirectUri);
    authUrl.searchParams.set('scope', zapierScopes);
    authUrl.searchParams.set('state', stateToken); // Use secure UUID, not encoded data
    authUrl.searchParams.set('response_type', 'code');

    console.log('Secure OAuth flow initiated:', { 
      user_id: user.id, 
      app_id: appId, 
      system_id: systemId,
      state_expires: expiresAt.toISOString(),
    });

    // Redirect to Zapier OAuth
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': authUrl.toString(),
      },
    });
  } catch (error) {
    console.error('OAuth start error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

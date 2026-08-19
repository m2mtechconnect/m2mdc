import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { app_id, code, webhook_url } = await req.json();

    if (!app_id) {
      return new Response(
        JSON.stringify({ error: 'app_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Initiating connection for app ${app_id} via Lovable OAuth`);

    // Get app details
    const { data: app, error: appError } = await supabase
      .from('zapier_apps')
      .select('*')
      .eq('id', app_id)
      .single();

    if (appError || !app) {
      return new Response(
        JSON.stringify({ error: 'App not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Initiate OAuth flow via server-side function (using Lovable credentials)
    const oauthStartUrl = `${supabaseUrl}/functions/v1/zapier-oauth-start?appId=${app_id}`;
    
    console.log('OAuth start URL:', oauthStartUrl);
    
    return new Response(
      JSON.stringify({
        success: true,
        oauth_url: oauthStartUrl,
        app,
        message: 'Use this URL to initiate OAuth flow',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error connecting Zapier app:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to initiate connection'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { appId, systemId } = await req.json();

    if (!appId) {
      throw new Error('appId is required');
    }

    // Generate state with metadata
    const state = btoa(JSON.stringify({
      user_id: user.id,
      system_id: systemId,
      app_id: appId,
      timestamp: Date.now(),
    }));

    // For MVP, create mock connection since Zapier OAuth requires app registration
    // Insert mock connection record
    const { error: insertError } = await supabase
      .from('integrations_connections')
      .upsert({
        user_id: user.id,
        provider: 'zapier',
        display_name: appId,
        status: 'connected',
        metadata: {
          app_id: appId,
          system_id: systemId,
          connected_at: new Date().toISOString(),
          mock: true,
        },
      }, {
        onConflict: 'user_id,provider,display_name',
      });

    if (insertError) {
      console.error('Failed to create mock connection:', insertError);
      throw new Error('Failed to establish connection');
    }

    console.log('Connection established:', { user_id: user.id, app_id: appId, system_id: systemId });

    // Return success without auth URL (connection created directly)
    const authUrl = null;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${appId} connected successfully`,
        authUrl,
        state,
        mock: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth connect error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
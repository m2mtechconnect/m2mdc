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

    const { app_id } = await req.json();

    if (!app_id) {
      return new Response(
        JSON.stringify({ error: 'app_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Disconnecting app ${app_id} for user ${user.id}`);

    // Update connection status to inactive
    const { error: updateError } = await supabase
      .from('integrations_tokens')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('app_id', app_id);

    if (updateError) {
      console.error('Error disconnecting app:', updateError);
      throw updateError;
    }

    // Log the disconnect
    await supabase
      .from('integration_sync_logs')
      .insert({
        user_id: user.id,
        app_id: app_id,
        sync_type: 'disconnect',
        status: 'success',
        records_synced: 0,
        duration_ms: 0
      });

    console.log(`Successfully disconnected app ${app_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'App disconnected successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error disconnecting Zapier app:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to disconnect Zapier app'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
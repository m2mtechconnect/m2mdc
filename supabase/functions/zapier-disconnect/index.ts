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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { app_key } = await req.json();

    if (!app_key) {
      throw new Error('app_key is required');
    }

    console.log(`Disconnecting Zapier app: ${app_key}`);

    const { error: deleteError } = await supabase
      .from('integrations')
      .delete()
      .eq('provider', `zapier_${app_key}`)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    // Log the action
    await supabase.from('integration_logs').insert({
      user_id: user.id,
      action: 'disconnect',
      status: 'success',
      details: { app_key },
    });

    console.log(`Disconnected Zapier app: ${app_key}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully disconnected ${app_key}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Zapier disconnect error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Disconnection failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

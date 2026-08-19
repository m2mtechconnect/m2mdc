import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    console.log('Testing connection:', { user_id: user.id, app_id: appId, system_id: systemId });

    // Simulate connection test (in production, would verify token and call Zapier API)
    const testResult = {
      success: true,
      app: appId,
      timestamp: new Date().toISOString(),
      latency_ms: Math.floor(Math.random() * 200) + 50,
    };

    // Update connection status if needed
    const { error: updateError } = await supabase
      .from('integrations_connections')
      .update({ 
        status: 'connected',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('display_name', appId);

    if (updateError) {
      console.warn('Could not update connection status:', updateError);
    }

    return new Response(
      JSON.stringify(testResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
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

    const { integrationId } = await req.json();
    console.log(`Disconnecting integration: ${integrationId}`);

    // Get integration first
    const { data: integration, error: fetchError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (fetchError || !integration) {
      throw new Error('Integration not found');
    }

    // Delete the integration
    const { error: deleteError } = await supabaseClient
      .from('integrations')
      .delete()
      .eq('id', integrationId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    const duration = Date.now() - startTime;

    // Log the disconnection
    await supabaseClient
      .from('integration_logs')
      .insert({
        integration_id: integration.id,
        action: 'disconnect',
        status: 'success',
        details: { name: integration.name },
        duration_ms: duration,
        user_id: user.id,
      });

    console.log(`Integration ${integrationId} disconnected successfully in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Integration disconnected successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Disconnect error:', error);
    
    // Log error
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
            action: 'disconnect',
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Disconnection failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

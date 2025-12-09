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

    const url = new URL(req.url);
    const systemId = url.searchParams.get('systemId');

    // Get all connections for user
    const { data: connections, error: connError } = await supabase
      .from('integrations_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'zapier');

    if (connError) throw connError;

    // If systemId provided, get agent-specific integrations
    let agentIntegrations = [];
    let recentActivity = [];
    
    if (systemId) {
      const { data: integrations, error: intError } = await supabase
        .from('agent_integrations')
        .select('*, integrations_connections(*)')
        .eq('system_id', systemId);

      if (intError) throw intError;
      agentIntegrations = integrations || [];

      // Get recent action logs
      const { data: logs, error: logsError } = await supabase
        .from('agent_action_logs')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!logsError) {
        recentActivity = logs || [];
      }
    }

    // Aggregate status
    const connectedCount = connections?.filter(c => c.status === 'connected').length || 0;
    const expiredCount = connections?.filter(c => c.status === 'expired').length || 0;
    const errorCount = connections?.filter(c => c.status === 'error').length || 0;

    const overallStatus = errorCount > 0 
      ? 'error' 
      : expiredCount > 0 
      ? 'expired' 
      : connectedCount > 0 
      ? 'connected' 
      : 'not_connected';

    console.log('Integration status retrieved:', { 
      user_id: user.id, 
      systemId, 
      connected: connectedCount,
      status: overallStatus 
    });

    return new Response(
      JSON.stringify({
        connections: connections || [],
        agentIntegrations,
        recentActivity,
        summary: {
          connected: connectedCount,
          expired: expiredCount,
          errors: errorCount,
          status: overallStatus,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Status check error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Status check failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { agentId, action, environment = 'dev' } = await req.json();

    if (!agentId || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Verify access using RBAC
    const { data: canOperate, error: rbacError } = await supabaseClient.rpc('user_can_access_agent', {
      check_user_id: user.id,
      check_agent_id: agentId,
      required_permission: 'operate'
    });

    if (rbacError || !canOperate) {
      return new Response(JSON.stringify({ error: 'Agent not found or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Get agent details
    const { data: agent } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const supportedActions = new Set(['run', 'pause', 'stop', 'restart']);
    if (!supportedActions.has(String(action))) {
      return new Response(JSON.stringify({ error_code: 'invalid_action', error: 'Invalid action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // No provider adapter or signed runtime receipt is configured for this
    // legacy endpoint. Fail closed instead of manufacturing health/runtime
    // state from a requested action.
    return new Response(JSON.stringify({
      success: false,
      error_code: 'runtime_not_configured',
      error: 'No verified runtime provider is configured for this agent.',
      action,
      environment,
      runtime_verified: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 409,
    });
  } catch (error) {
    console.error('Runtime action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
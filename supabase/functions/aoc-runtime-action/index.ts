import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Map action to status
    const statusMap: Record<string, string> = {
      run: 'running',
      pause: 'paused',
      stop: 'stopped',
      restart: 'running',
    };

    const newStatus = statusMap[action] || 'stopped';

    // Update runtime status
    const { data: runtimeStatus, error: runtimeError } = await supabaseClient
      .from('agent_runtime_status')
      .upsert({
        agent_id: agentId,
        environment,
        status: newStatus,
        last_action: action,
        last_action_at: new Date().toISOString(),
        health_status: 'healthy',
        current_version: agent.version,
      }, {
        onConflict: 'agent_id,environment',
      })
      .select()
      .single();

    if (runtimeError) {
      console.error('Runtime status update error:', runtimeError);
    }

    // Update agent status
    await supabaseClient
      .from('agents')
      .update({ status: newStatus === 'running' ? 'active' : newStatus })
      .eq('id', agentId);

    // Log activity
    await supabaseClient
      .from('agent_activity_logs')
      .insert({
        agent_id: agentId,
        log_type: 'info',
        message: `Agent ${action} initiated`,
        details: { action, environment, user_id: user.id },
      });

    // Log to audit
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: `agent_${action}`,
        entity_type: 'agent',
        entity_id: agentId,
        details: { environment, status: newStatus },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newStatus,
        action,
        runtime: runtimeStatus 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
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
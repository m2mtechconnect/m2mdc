import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { agentId, action } = await req.json();

    if (!agentId || !action) {
      return new Response(JSON.stringify({ error: 'Missing agentId or action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('owner_id', user.id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let newStatus: string;
    let deploymentStatus: string;

    switch (action) {
      case 'run':
        newStatus = 'active';
        deploymentStatus = 'running';
        break;
      case 'pause':
        newStatus = 'paused';
        deploymentStatus = 'paused';
        break;
      case 'stop':
        newStatus = 'draft';
        deploymentStatus = 'stopped';
        break;
      case 'restart':
        // First stop, then start
        newStatus = 'active';
        deploymentStatus = 'running';
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Update agent status
    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateError) throw updateError;

    // Update or create deployment record
    const { data: existingDeployment } = await supabase
      .from('deployments')
      .select('*')
      .eq('system_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingDeployment) {
      await supabase
        .from('deployments')
        .update({ 
          status: deploymentStatus,
          health: action === 'stop' ? 'stopped' : 'healthy',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDeployment.id);
    } else {
      await supabase
        .from('deployments')
        .insert({
          system_id: agentId,
          status: deploymentStatus,
          health: action === 'stop' ? 'stopped' : 'healthy',
          deployed_by: user.id,
          version: agent.version,
          region: 'us-east-1',
        });
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        entity_type: 'agent',
        entity_id: agentId,
        action: `agent_${action}`,
        details: {
          agent_name: agent.name,
          previous_status: agent.status,
          new_status: newStatus,
          timestamp: new Date().toISOString(),
        },
      });

    // Create activity log
    await supabase
      .from('agent_action_logs')
      .insert({
        system_id: agentId,
        action_key: `runtime.${action}`,
        status: 'success',
        action_params: { user_id: user.id },
        duration_ms: 0,
      });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentId,
          action,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Runtime control error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

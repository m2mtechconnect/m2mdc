import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { agentId, targetEnvironment, notes } = await req.json();

    if (!agentId || !targetEnvironment) {
      return new Response(
        JSON.stringify({ error: 'Missing agentId or targetEnvironment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[aoc-environment-promotion] User ${user.id} promoting agent ${agentId} to ${targetEnvironment}`);

    // Get the current agent
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('*, environment:environments(name)')
      .eq('id', agentId)
      .eq('owner_id', user.id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create target environment
    const { data: existingEnv } = await supabaseClient
      .from('environments')
      .select('id')
      .eq('name', targetEnvironment)
      .single();

    let targetEnvId = existingEnv?.id;

    if (!targetEnvId) {
      const { data: newEnv, error: envError } = await supabaseClient
        .from('environments')
        .insert({ name: targetEnvironment })
        .select('id')
        .single();

      if (envError) {
        console.error('[aoc-environment-promotion] Environment creation error:', envError);
        return new Response(
          JSON.stringify({ error: 'Failed to create environment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetEnvId = newEnv.id;
    }

    // Update agent's environment
    const { error: updateError } = await supabaseClient
      .from('agents')
      .update({ 
        environment_id: targetEnvId,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('[aoc-environment-promotion] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to promote agent' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create deployment record
    const { data: deployment, error: deployError } = await supabaseClient
      .from('deployments')
      .insert({
        system_id: agentId,
        deployed_by: user.id,
        status: 'active',
        region: targetEnvironment,
        version: `v${Date.now()}`,
        model: agent.model_id || 'default'
      })
      .select()
      .single();

    if (deployError) {
      console.error('[aoc-environment-promotion] Deployment record error:', deployError);
    }

    // Log the promotion in audit logs
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        entity_type: 'agent',
        entity_id: agentId,
        action: 'environment.promote',
        details: {
          from_environment: agent.environment?.name || 'none',
          to_environment: targetEnvironment,
          deployment_id: deployment?.id,
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`[aoc-environment-promotion] Successfully promoted agent ${agentId} to ${targetEnvironment}`);

    return new Response(
      JSON.stringify({
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          environment: targetEnvironment
        },
        deployment: deployment || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[aoc-environment-promotion] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

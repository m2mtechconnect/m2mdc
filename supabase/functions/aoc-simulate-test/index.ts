import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { agentId, testQuery, scenarioId } = await req.json();

    if (!agentId || !testQuery) {
      return new Response(JSON.stringify({ error: 'Missing agentId or testQuery' }), {
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
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create test run record
    const testRunId = crypto.randomUUID();
    const startTime = Date.now();

    await supabase
      .from('agent_runs')
      .insert({
        id: testRunId,
        agent_id: agentId,
        user_id: user.id,
        status: 'running',
        input: { query: testQuery, scenario_id: scenarioId, test_mode: true },
      });

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 1500));

    const duration = Date.now() - startTime;
    const success = Math.random() > 0.2; // 80% success rate

    // Update test run
    await supabase
      .from('agent_runs')
      .update({
        status: success ? 'completed' : 'error',
        output: success ? {
          response: 'Test simulation completed successfully',
          scenario_id: scenarioId,
          test_metrics: {
            latency_ms: duration,
            tokens_used: Math.floor(Math.random() * 500) + 100,
          }
        } : null,
        error: success ? null : 'Simulated test failure',
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      })
      .eq('id', testRunId);

    // Log the test action
    await supabase
      .from('agent_action_logs')
      .insert({
        system_id: agentId,
        run_id: testRunId,
        action_key: 'simulation.test_run',
        status: success ? 'success' : 'error',
        action_params: { query: testQuery, scenario_id: scenarioId },
        response: success ? { message: 'Test completed' } : null,
        error_message: success ? null : 'Simulated test failure',
        duration_ms: duration,
      });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          testRunId,
          status: success ? 'completed' : 'error',
          duration,
          output: success ? 'Test simulation completed successfully' : null,
          error: success ? null : 'Simulated test failure',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Simulation test error:', error);
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

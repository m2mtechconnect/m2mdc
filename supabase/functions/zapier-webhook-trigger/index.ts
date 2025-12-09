import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zapier-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate Zapier signature
    const signature = req.headers.get('x-zapier-signature');
    const webhookSecret = Deno.env.get('ZAPIER_WEBHOOK_SECRET');
    
    if (webhookSecret && signature) {
      // TODO: Implement signature verification
      console.log('Webhook signature received:', signature);
    }

    const payload = await req.json();
    const { systemId, versionId, input, context, connectionId } = payload;

    if (!systemId || !input) {
      throw new Error('systemId and input are required');
    }

    console.log('Zapier trigger received:', { systemId, connectionId, traceId: context?.traceId });

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', systemId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    // Create agent run
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        agent_id: systemId,
        user_id: agent.owner_id,
        status: 'running',
        input: {
          ...input,
          source: 'zapier',
          context,
        },
      })
      .select()
      .single();

    if (runError) throw runError;

    console.log('Agent run created:', run.id);

    // Execute agent (simplified - in production would invoke agent runtime)
    const response = {
      message: `Agent ${agent.name} triggered successfully`,
      runId: run.id,
      status: 'queued',
    };

    // Update run with result
    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        output: response,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    // If context has callback URL, optionally POST results back
    if (context?.callbackUrl) {
      console.log('Would send callback to:', context.callbackUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        runId: run.id,
        response,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook trigger error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Trigger failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
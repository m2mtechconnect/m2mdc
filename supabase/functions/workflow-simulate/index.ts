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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { system_id, input_data } = await req.json();

    if (!system_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: system_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('system_id', system_id)
      .maybeSingle();

    if (workflowError) {
      return new Response(JSON.stringify({ 
        error: `Database error: ${workflowError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!workflow) {
      return new Response(JSON.stringify({ 
        error: 'No workflow configured for this system. Please create a workflow in the Builder first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const graph = workflow.config;
    const execution_trace: any[] = [];
    const startTime = Date.now();

    // Simulate execution of each node
    for (const node of graph.nodes) {
      const nodeStart = Date.now();
      
      try {
        const result: any = { status: 'success' };

        switch (node.type) {
          case 'LLM':
            result.output = `[Mock LLM Response for node ${node.id}]`;
            result.tokens = 150;
            break;

          case 'RAG_RETRIEVE':
            result.output = `[Mock RAG Retrieved 3 documents for node ${node.id}]`;
            result.documents = 3;
            break;

          case 'MCP_TOOL':
            result.output = `[Mock MCP Tool '${node.data?.tool || 'unknown'}' executed for node ${node.id}]`;
            result.tool = node.data?.tool;
            break;

          case 'ZAPIER_ACTION':
            result.output = `[Mock Zapier Action '${node.data?.action || 'unknown'}' triggered for node ${node.id}]`;
            result.action = node.data?.action;
            break;

          case 'BRANCH':
            result.output = `[Branch decision made at node ${node.id}]`;
            result.branch = 'true';
            break;

          case 'RATE_LIMIT':
            result.output = `[Rate limit check passed for node ${node.id}]`;
            result.remaining = 95;
            break;

          case 'NOTIFY':
            result.output = `[Notification sent from node ${node.id}]`;
            break;

          case 'REPORT':
            result.output = `[Report generated at node ${node.id}]`;
            break;

          default:
            result.output = `[Unknown node type: ${node.type}]`;
        }

        execution_trace.push({
          node_id: node.id,
          node_type: node.type,
          status: 'success',
          duration_ms: Date.now() - nodeStart,
          result,
        });

      } catch (nodeError) {
        execution_trace.push({
          node_id: node.id,
          node_type: node.type,
          status: 'error',
          duration_ms: Date.now() - nodeStart,
          error: nodeError instanceof Error ? nodeError.message : 'Unknown error',
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    return new Response(JSON.stringify({ 
      success: true,
      simulation: {
        system_id,
        workflow_id: workflow.id,
        execution_trace,
        summary: {
          total_nodes: graph.nodes.length,
          total_edges: graph.edges.length,
          duration_ms: totalDuration,
          successful_nodes: execution_trace.filter(t => t.status === 'success').length,
          failed_nodes: execution_trace.filter(t => t.status === 'error').length,
        },
      },
      message: 'Workflow simulation completed',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Workflow simulation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Simulation failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

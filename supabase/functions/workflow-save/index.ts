import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_NODE_TYPES = [
  'LLM',
  'RAG_RETRIEVE',
  'MCP_TOOL',
  'ZAPIER_ACTION',
  'BRANCH',
  'RATE_LIMIT',
  'NOTIFY',
  'REPORT',
];

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

    const { system_id, name, graph } = await req.json();

    if (!system_id || !name || !graph) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: system_id, name, graph' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate graph structure
    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid graph: nodes array required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!graph.edges || !Array.isArray(graph.edges)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid graph: edges array required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate node types
    for (const node of graph.nodes) {
      if (!node.id || !node.type) {
        return new Response(JSON.stringify({ 
          error: `Invalid node: id and type required` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!VALID_NODE_TYPES.includes(node.type)) {
        return new Response(JSON.stringify({ 
          error: `Invalid node type '${node.type}'. Must be one of: ${VALID_NODE_TYPES.join(', ')}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate edges reference valid nodes
    const nodeIds = new Set(graph.nodes.map((n: any) => n.id));
    for (const edge of graph.edges) {
      if (!edge.source || !edge.target) {
        return new Response(JSON.stringify({ 
          error: 'Invalid edge: source and target required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return new Response(JSON.stringify({ 
          error: `Edge references non-existent node` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Create or update workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .upsert({
        system_id,
        created_by: user.id,
        name,
        description: `Workflow for system ${system_id}`,
        config: graph,
        status: 'draft',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'system_id',
      })
      .select()
      .single();

    if (workflowError) {
      console.error('Error saving workflow:', workflowError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save workflow' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update agent with workflow_graph_id
    const { error: agentError } = await supabase
      .from('agents')
      .update({
        workflow_graph_id: workflow.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', system_id);

    if (agentError) {
      console.warn('Failed to update agent with workflow_graph_id:', agentError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      workflow_id: workflow.id,
      node_count: graph.nodes.length,
      edge_count: graph.edges.length,
      message: 'Workflow saved successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Workflow save error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Workflow save failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Digital Twin Runtime Execution Edge Function
 * Internal function that executes the LangGraph workflow
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This is a simplified runtime executor
// In production, this would import and call the full runtime module
// For now, we'll create a minimal execution engine

const runtimeRequestSchema = z.object({
  twinId: z.string().uuid(),
  eventId: z.string().min(1),
  payload: z.record(z.unknown()),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Invalid authentication');
    }

    const body = await req.json();
    const validation = runtimeRequestSchema.safeParse(body);
    
    if (!validation.success) {
      throw new Error('Invalid request body');
    }

    const { twinId, eventId, payload } = validation.data;
    const runId = crypto.randomUUID();

    console.log(`Starting runtime execution: ${runId} for twin: ${twinId}`);

    // Load twin configuration
    const { data: twin, error: twinError } = await supabase
      .from('digital_twins')
      .select('*')
      .eq('id', twinId)
      .single();

    if (twinError || !twin) {
      throw new Error(`Twin not found: ${twinId}`);
    }

    const config = twin.config as any;

    // Execute workflow
    const logs: any[] = [];
    const stateChanges: any[] = [];
    let status = 'running';
    const context = {
      event: payload,
      twin: { id: twinId, slug: twin.slug, name: twin.name },
      state: {},
    };

    logs.push({
      nodeId: 'start',
      message: `Workflow started for event: ${eventId}`,
      timestamp: new Date().toISOString(),
      level: 'info',
    });

    // Execute nodes sequentially
    const nodes = config.workflow?.nodes || [];
    let currentNodeId = config.workflow?.entryPoint;
    const visitedNodes = new Set<string>();

    while (currentNodeId && !visitedNodes.has(currentNodeId)) {
      visitedNodes.add(currentNodeId);
      
      const node = nodes.find((n: any) => n.id === currentNodeId);
      if (!node) break;

      logs.push({
        nodeId: node.id,
        message: `Executing node: ${node.name} (${node.type})`,
        timestamp: new Date().toISOString(),
        level: 'info',
      });

      // Simple node execution
      if (node.type === 'human_in_loop') {
        status = 'pending_human';
        logs.push({
          nodeId: node.id,
          message: 'Human approval required',
          timestamp: new Date().toISOString(),
          level: 'info',
        });
        break;
      }

      if (node.type === 'transform') {
        const updates = node.config?.stateUpdates || {};
        Object.assign(context.state, updates);
        stateChanges.push({
          nodeId: node.id,
          timestamp: new Date().toISOString(),
          stateBefore: {},
          stateAfter: context.state,
        });
      }

      // Move to next node
      if (node.nextNodes && node.nextNodes.length > 0) {
        currentNodeId = node.nextNodes[0];
      } else {
        break;
      }
    }

    if (status === 'running') {
      status = 'completed';
    }

    logs.push({
      nodeId: 'end',
      message: `Workflow ${status}`,
      timestamp: new Date().toISOString(),
      level: 'info',
    });

    // Persist run
    const { error: insertError } = await supabase
      .from('digital_twin_runs')
      .insert({
        twin_id: twinId,
        user_id: user.id,
        event_id: eventId,
        run_id: runId,
        status,
        logs,
        state_changes: stateChanges,
      });

    if (insertError) {
      console.error('Failed to persist run:', insertError);
    }

    const result = {
      twinId,
      runId,
      eventId,
      status,
      logs,
      stateChanges,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Runtime error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Runtime failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

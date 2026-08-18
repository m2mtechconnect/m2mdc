/**
 * /v1/workflow-run
 * 
 * PURPOSE: Execute or simulate a workflow with validation and node orchestration
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - workflowId: string (required) - UUID of the workflow to execute
 * - testInput: object (optional) - Test input data for the workflow
 * - dryRun: boolean (default: true) - If true, simulate execution; if false, run real execution
 * 
 * RESPONSE:
 * - success: boolean
 * - runId: string - UUID of the workflow run record
 * - output: object - Final output data from workflow execution
 * - events: array - Array of execution events for each node
 * - durationMs: number - Total execution time in milliseconds
 * - nodesExecuted: number - Count of nodes executed
 * - message: string - Success or error message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  workflowId: z.string().uuid("Invalid workflow ID"),
  testInput: z.record(z.unknown()).optional(),
  dryRun: z.boolean().default(true),
});

interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, any>;
}

interface WorkflowEdge {
  from_node_id: string;
  to_node_id: string;
}

serve(createHandler({
  name: "workflow-run",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { workflowId, testInput, dryRun } = input;
    const { supabase, userId, log } = context;

    const startTime = Date.now();

    log("Starting workflow execution", { workflowId, dryRun });

    // Fetch workflow nodes and edges
    const [nodesResult, edgesResult] = await Promise.all([
      supabase.from('workflow_nodes').select('*').eq('workflow_id', workflowId).order('created_at'),
      supabase.from('workflow_edges').select('*').eq('workflow_id', workflowId),
    ]);

    if (nodesResult.error) {
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: `Failed to load workflow nodes: ${nodesResult.error.message}`,
        status: 404,
      };
    }

    if (edgesResult.error) {
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: `Failed to load workflow edges: ${edgesResult.error.message}`,
        status: 404,
      };
    }

    const nodes = nodesResult.data as WorkflowNode[];
    const edges = edgesResult.data as WorkflowEdge[];

    if (!nodes || nodes.length === 0) {
      throw {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Workflow has no nodes',
        status: 400,
      };
    }

    // Create run record
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        status: 'running',
        created_by: userId,
        metrics: { dryRun, testInput }
      })
      .select()
      .single();

    if (runError) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to create run record: ${runError.message}`,
        status: 500,
      };
    }

    const runId = run.id;
    const events: any[] = [];

    try {
      // Validate workflow structure
      log("Validating workflow structure", { runId });
      await logEvent(supabase, runId, 'validation', 'Validating workflow structure', true);

      const validationErrors = validateWorkflow(nodes, edges);
      if (validationErrors.length > 0) {
        await logEvent(supabase, runId, 'validation', `Validation failed: ${validationErrors.join(', ')}`, false, validationErrors);
        await supabase
          .from('workflow_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', runId);

        throw {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Workflow validation failed',
          status: 400,
          details: { validationErrors },
        };
      }

      await logEvent(supabase, runId, 'validation', 'Validation passed', true);

      // Build execution graph
      const executionOrder = topologicalSort(nodes, edges);
      log("Execution order determined", { executionOrder });

      // Execute nodes in order
      let currentData = testInput || { message: "Test input data" };
      
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        log(`Executing node ${nodeId}`, { type: node.type });
        await logEvent(supabase, runId, node.type, `Executing ${node.type} node`, true, { nodeId, config: node.config });

        try {
          if (dryRun) {
            // Dry run: simulate execution
            currentData = await simulateNode(node, currentData);
            events.push({
              stage: node.type,
              nodeId,
              status: 'simulated',
              output: currentData,
              latencyMs: Math.floor(Math.random() * 500) + 100
            });
          } else {
            // Real execution (not implemented yet)
            throw new Error('Real workflow execution not yet implemented');
          }

          await logEvent(supabase, runId, node.type, `${node.type} node completed`, true, { output: currentData });

        } catch (error: any) {
          log(`Node ${nodeId} failed`, { error: error.message });
          await logEvent(supabase, runId, node.type, `${node.type} node failed: ${error.message}`, false, { error: error.message });
          
          await supabase
            .from('workflow_runs')
            .update({ 
              status: 'failed',
              completed_at: new Date().toISOString(),
              metrics: { dryRun, error: error.message, failedNodeId: nodeId }
            })
            .eq('id', runId);

          throw {
            code: ErrorCodes.INTERNAL_ERROR,
            message: `Node ${node.type} failed: ${error.message}`,
            status: 500,
            details: { failedNodeId: nodeId, events },
          };
        }
      }

      const durationMs = Date.now() - startTime;

      // Mark run as complete
      await supabase
        .from('workflow_runs')
        .update({ 
          status: 'success',
          completed_at: new Date().toISOString(),
          metrics: { dryRun, testInput, durationMs, nodesExecuted: executionOrder.length }
        })
        .eq('id', runId);

      log("Workflow completed successfully", { durationMs, nodesExecuted: executionOrder.length });

      return {
        success: true,
        runId,
        output: currentData,
        events,
        durationMs,
        nodesExecuted: executionOrder.length,
        message: dryRun ? 'Dry run completed successfully' : 'Workflow executed successfully'
      };

    } catch (error: any) {
      // If error was already thrown with our format, rethrow
      if (error.code) throw error;
      
      // Otherwise wrap it
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error.message || 'Workflow execution failed',
        status: 500,
      };
    }
  }
}));

// Helper: Log workflow event
async function logEvent(
  supabase: any,
  runId: string,
  stage: string,
  message: string,
  success: boolean,
  payload?: any
) {
  try {
    await supabase
      .from('workflow_run_events')
      .insert({
        run_id: runId,
        stage,
        ok: success,
        payload: payload || { message },
        latency_ms: 0
      });
  } catch (error) {
    console.error('[logEvent] Failed to log event:', error);
  }
}

// Helper: Validate workflow structure
function validateWorkflow(nodes: any[], edges: any[]): string[] {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Workflow has no nodes');
    return errors;
  }

  // Check for at least one entry node (node with no incoming edges)
  const nodesWithIncoming = new Set(edges.map(e => e.to_node_id));
  const entryNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));

  if (entryNodes.length === 0) {
    errors.push('No entry point found (all nodes have incoming edges - circular dependency)');
  }

  // Check for disconnected nodes (more than 1 node but no edges)
  if (nodes.length > 1 && edges.length === 0) {
    errors.push('Nodes are disconnected (no edges between nodes)');
  }

  // Check for cycles
  const hasCycle = detectCycle(nodes, edges);
  if (hasCycle) {
    errors.push('Workflow contains a cycle (circular dependency detected)');
  }

  // Validate node configurations
  nodes.forEach(node => {
    if (node.type === 'analyze' && !node.config?.model) {
      errors.push(`Analyze node "${node.id}" is missing model configuration`);
    }
    if (node.type === 'classify' && (!node.config?.labels || node.config.labels.length === 0)) {
      errors.push(`Classify node "${node.id}" is missing classification labels`);
    }
  });

  return errors;
}

// Helper: Topological sort for execution order
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach(edge => {
    adjacencyList.get(edge.from_node_id)?.push(edge.to_node_id);
    inDegree.set(edge.to_node_id, (inDegree.get(edge.to_node_id) || 0) + 1);
  });

  // Find nodes with no dependencies
  const queue: string[] = [];
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });

  const result: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    adjacencyList.get(nodeId)?.forEach(neighborId => {
      const newDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) {
        queue.push(neighborId);
      }
    });
  }

  return result;
}

// Helper: Detect cycles
function detectCycle(nodes: any[], edges: any[]): boolean {
  const adjacencyList = new Map<string, string[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  nodes.forEach(node => adjacencyList.set(node.id, []));
  edges.forEach(edge => adjacencyList.get(edge.from_node_id)?.push(edge.to_node_id));

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    for (const neighborId of adjacencyList.get(nodeId) || []) {
      if (!visited.has(neighborId)) {
        if (dfs(neighborId)) return true;
      } else if (recursionStack.has(neighborId)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

// Helper: Simulate node execution
async function simulateNode(node: WorkflowNode, inputData: any): Promise<any> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));

  switch (node.type) {
    case 'analyze':
      return {
        ...inputData,
        analyzed: true,
        summary: `Analyzed using ${node.config?.model || 'default model'}`,
        sentiment: 'neutral',
        keyTopics: ['automation', 'workflow', 'efficiency']
      };

    case 'classify': {
      const labels = node.config?.labels || ['uncategorized'];
      return {
        ...inputData,
        classified: true,
        label: labels[0],
        confidence: 0.85
      };
    }

    case 'notify_teams':
      return {
        ...inputData,
        notified: true,
        channel: node.config?.channel || '#general',
        timestamp: new Date().toISOString()
      };

    case 'create_ticket_jira':
      return {
        ...inputData,
        ticketCreated: true,
        ticketId: `PROJ-${Math.floor(Math.random() * 1000)}`,
        project: node.config?.project || 'PROJ'
      };

    case 'write_salesforce':
      return {
        ...inputData,
        salesforceWritten: true,
        recordId: `00Q${Math.random().toString(36).substring(7)}`,
        object: node.config?.object || 'Lead'
      };

    case 'generate_report':
      return {
        ...inputData,
        reportGenerated: true,
        format: node.config?.format || 'PDF',
        url: `https://reports.example.com/${Math.random().toString(36).substring(7)}.pdf`
      };

    default:
      return {
        ...inputData,
        processed: true,
        nodeType: node.type
      };
  }
}

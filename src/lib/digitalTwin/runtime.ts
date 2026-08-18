/**
 * Digital Twin Runtime - Core Execution Engine
 * Loads twin configs, builds LangGraph graphs, executes workflows
 */

import { supabase } from "@/integrations/supabase/client";
import { DigitalTwinConfig, DigitalTwinNode, DigitalTwinNodeType } from "@/types/digitalTwin";
import { StateGraph, END } from "@langchain/langgraph";
import { makeAICompletion } from "@/lib/llm/client";
import { logger } from "@/lib/logger";

export type TwinRunResult = {
  twinId: string;
  runId: string;
  eventId: string;
  status: "completed" | "pending_human" | "failed";
  logs: Array<{ nodeId: string; message: string; timestamp: string; level?: string }>;
  stateChanges: any[];
  humanTasks?: Array<{
    nodeId: string;
    role: string;
    taskId: string;
    summary: string;
  }>;
};

export type TwinRunContext = {
  event: any;
  twin: { id: string; slug: string; goal?: string };
  state: Record<string, any>;
  logs: Array<{ nodeId: string; message: string; timestamp: string; level?: string }>;
  stateChanges: Array<{ nodeId: string; timestamp: string; stateBefore?: Record<string, any>; stateAfter: Record<string, any> }>;
  humanTasks: Array<{ nodeId: string; role: string; taskId: string; summary: string }>;
  status: "running" | "completed" | "pending_human" | "failed";
};

/**
 * Load a Digital Twin configuration by ID
 */
export async function loadDigitalTwinById(twinId: string): Promise<DigitalTwinConfig> {
  logger.info(`Loading digital twin: ${twinId}`, { component: "DigitalTwinRuntime" });

  const { data, error } = await supabase
    .from("digital_twins")
    .select("*")
    .eq("id", twinId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load digital twin ${twinId}: ${error?.message || "Not found"}`);
  }

  // Config is stored as JSONB
  return data.config as unknown as DigitalTwinConfig;
}

/**
 * Execute a Digital Twin workflow for a given event
 */
export async function runTwinEvent(params: {
  twinId: string;
  eventId: string;
  payload: any;
}): Promise<TwinRunResult> {
  const { twinId, eventId, payload } = params;
  const runId = crypto.randomUUID();

  logger.info(`Starting twin run: ${runId}`, {
    component: "DigitalTwinRuntime",
    metadata: { twinId, eventId },
  });

  try {
    // Load twin configuration
    const config = await loadDigitalTwinById(twinId);

    // Initialize run context
    const context: TwinRunContext = {
      event: payload,
      twin: { id: twinId, slug: config.entities[0]?.name || "unknown", goal: config.goal },
      state: {},
      logs: [],
      stateChanges: [],
      humanTasks: [],
      status: "running",
    };

    // Build and execute graph
    const graph = buildGraphFromTwinConfig(config);
    const result = await executeGraph(graph, context, config);

    // Persist run
    await persistTwinRun({
      twinId,
      eventId,
      runId,
      status: result.status,
      logs: result.logs,
      stateChanges: result.stateChanges,
      humanTasks: result.humanTasks,
    });

    return {
      twinId,
      runId,
      eventId,
      status: result.status,
      logs: result.logs,
      stateChanges: result.stateChanges,
      humanTasks: result.humanTasks,
    };
  } catch (error) {
    logger.error("Twin run failed", error, { component: "DigitalTwinRuntime", metadata: { twinId, eventId, runId } });

    const failedResult: TwinRunResult = {
      twinId,
      runId,
      eventId,
      status: "failed",
      logs: [
        {
          nodeId: "error",
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          level: "error",
        },
      ],
      stateChanges: [],
    };

    // Still persist the failed run
    await persistTwinRun({
      twinId,
      eventId,
      runId,
      status: "failed",
      logs: failedResult.logs,
      stateChanges: [],
    });

    return failedResult;
  }
}

/**
 * Build a LangGraph graph from Digital Twin configuration
 */
function buildGraphFromTwinConfig(config: DigitalTwinConfig): any {
  // Use simple workflow state instead of StateGraph for now
  // This is a simplified version that executes nodes sequentially
  return {
    nodes: config.workflow.nodes,
    entryPoint: config.workflow.entryPoint,
  };
}

/**
 * Create a node handler function for a given node type
 */
function createNodeHandler(node: DigitalTwinNode, config: DigitalTwinConfig) {
  return async (context: TwinRunContext): Promise<Partial<TwinRunContext>> => {
    const startTime = new Date().toISOString();
    context.logs.push({
      nodeId: node.id,
      message: `Starting node: ${node.name} (${node.type})`,
      timestamp: startTime,
      level: "info",
    });

    try {
      let updates: Partial<TwinRunContext> = {};

      switch (node.type) {
        case "trigger":
          updates = await handleEventEntry(node, context);
          break;
        case "decision":
          // A decision node that declares explicit rules is deterministic and
          // must not be routed to the LLM.
          updates = Array.isArray((node.config as any)?.rules) && (node.config as any).rules.length > 0
            ? await handleRuleDecision(node, context)
            : await handleAIDecision(node, context, config);
          break;
        case "condition":
          updates = await handleRuleDecision(node, context);
          break;
        case "action":
          updates = await handleNotification(node, context);
          break;
        case "human_in_loop":
          updates = await handleHumanApproval(node, context);
          break;
        case "transform":
          updates = await handleStateUpdate(node, context);
          break;
        case "end":
          updates = {};
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      context.logs.push({
        nodeId: node.id,
        message: `Completed node: ${node.name}`,
        timestamp: new Date().toISOString(),
        level: "info",
      });

      return updates;
    } catch (error) {
      context.logs.push({
        nodeId: node.id,
        message: `Node error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        level: "error",
      });
      context.status = "failed";
      return { status: "failed" };
    }
  };
}

/**
 * Handle event_entry node - initialize context
 */
async function handleEventEntry(node: DigitalTwinNode, context: TwinRunContext): Promise<Partial<TwinRunContext>> {
  context.logs.push({
    nodeId: node.id,
    message: `Event entry initialized with payload`,
    timestamp: new Date().toISOString(),
    level: "info",
  });
  return {};
}

/**
 * Handle ai_decision node - call Gemini LLM with structured output
 */
async function handleAIDecision(
  node: DigitalTwinNode,
  context: TwinRunContext,
  config: DigitalTwinConfig
): Promise<Partial<TwinRunContext>> {
  const systemPrompt = node.config.systemPrompt as string || `You are an AI assistant for a digital twin system.
Twin Goal: ${context.twin.goal || "Process events efficiently"}
Node Description: ${node.description || "Make a decision"}`;

  // Check if outputSchema is defined - request structured JSON response
  const outputSchema = node.config.outputSchema;
  
  let userPrompt = `Process this event: ${JSON.stringify(context.event, null, 2)}`;
  
  if (outputSchema) {
    userPrompt += `\n\nPlease respond with a JSON object matching this schema:\n${JSON.stringify(outputSchema, null, 2)}\n\nRespond ONLY with valid JSON, no additional text.`;
  }

  try {
    const response = await makeAICompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "pro", temperature: 0.3, maxTokens: 2048 }
    );

    const decision = response.choices?.[0]?.message?.content || "No response";

    // Try to parse structured output if outputSchema is defined
    if (outputSchema) {
      try {
        // Extract JSON from response (may have markdown code blocks)
        let jsonText = decision.trim();
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.slice(7);
        }
        if (jsonText.startsWith("```")) {
          jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith("```")) {
          jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        const structuredData = JSON.parse(jsonText);
        
        context.logs.push({
          nodeId: node.id,
          message: `AI Classification complete - Priority: ${structuredData.priority || "N/A"}, Score: ${structuredData.readiness_score || "N/A"}`,
          timestamp: new Date().toISOString(),
          level: "info",
        });

        // Store structured data in context state for downstream nodes
        context.state.classification = structuredData;
        Object.assign(context.state, structuredData);

        return { state: context.state };
      } catch (parseError) {
        // If JSON parsing fails, fall back to text storage
        console.warn("Failed to parse structured output, storing as text:", parseError);
      }
    }

    // Fallback: store as text
    context.logs.push({
      nodeId: node.id,
      message: `AI Decision: ${decision.substring(0, 200)}`,
      timestamp: new Date().toISOString(),
      level: "info",
    });

    context.state[`ai_decision_${node.id}`] = decision;

    return { state: context.state };
  } catch (error) {
    throw new Error(`AI decision failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle rule_decision node - evaluate rules
 */
async function handleRuleDecision(node: DigitalTwinNode, context: TwinRunContext): Promise<Partial<TwinRunContext>> {
  const rules = node.config.rules as Array<{ field: string; operator: string; value: any; action: string }> || [];

  for (const rule of rules) {
    const fieldValue = getNestedValue(context.event, rule.field);
    const matches = evaluateOperator(fieldValue, rule.operator, rule.value);

    if (matches) {
      context.logs.push({
        nodeId: node.id,
        message: `Rule matched: ${rule.field} ${rule.operator} ${rule.value}`,
        timestamp: new Date().toISOString(),
        level: "info",
      });
      context.state[`rule_result_${node.id}`] = rule.action;
      return { state: context.state };
    }
  }

  context.logs.push({
    nodeId: node.id,
    message: "No rules matched, using default",
    timestamp: new Date().toISOString(),
    level: "info",
  });

  return {};
}

/**
 * Handle human_approval node - create pending task
 */
async function handleHumanApproval(node: DigitalTwinNode, context: TwinRunContext): Promise<Partial<TwinRunContext>> {
  const taskId = crypto.randomUUID();
  const humanTask = {
    nodeId: node.id,
    role: node.humanInLoop?.assignedTo || "admin",
    taskId,
    summary: node.humanInLoop?.instructions || "Approval required",
  };

  context.humanTasks.push(humanTask);
  context.status = "pending_human";

  context.logs.push({
    nodeId: node.id,
    message: `Human approval task created: ${taskId}`,
    timestamp: new Date().toISOString(),
    level: "info",
  });

  return { humanTasks: context.humanTasks, status: "pending_human" };
}

/**
 * Handle state_update node - update state with proper data extraction
 */
async function handleStateUpdate(node: DigitalTwinNode, context: TwinRunContext): Promise<Partial<TwinRunContext>> {
  const updates = node.config.stateUpdates as Record<string, any> || {};
  const stateBefore = { ...context.state };

  // Build actual state updates from context and AI classification
  const actualUpdates: Record<string, any> = {};
  
  // Generate case_id if needed
  if (updates.case_id === "generated UUID") {
    actualUpdates.case_id = crypto.randomUUID();
  }
  
  // Use classification results from AI decision node
  if (context.state.classification) {
    actualUpdates.program_fit = context.state.program_fit || [];
    actualUpdates.readiness_score = context.state.readiness_score || 0;
    actualUpdates.priority = context.state.priority || "low";
    actualUpdates.rationale = context.state.rationale || "";
    
    // Determine status based on priority and rules
    if (context.state.priority === "high" || context.state.readiness_score >= 70) {
      actualUpdates.status = "triaged";
    } else if (context.state.readiness_score < 40) {
      actualUpdates.status = "needs_followup";
    } else {
      actualUpdates.status = "triaged";
    }
  }

  // Merge with explicit updates
  Object.assign(actualUpdates, updates);
  Object.assign(context.state, actualUpdates);

  // Record state change
  context.stateChanges = context.stateChanges || [];
  context.stateChanges.push({
    nodeId: node.id,
    timestamp: new Date().toISOString(),
    stateBefore,
    stateAfter: { ...context.state },
  });

  context.logs.push({
    nodeId: node.id,
    message: `State updated: ${Object.keys(actualUpdates).join(", ")}`,
    timestamp: new Date().toISOString(),
    level: "info",
  });

  return { state: context.state };
}

/**
 * Handle notification node - log notification (TODO: implement real notifications)
 */
async function handleNotification(node: DigitalTwinNode, context: TwinRunContext): Promise<Partial<TwinRunContext>> {
  const recipient = node.config.recipient || "system";
  const message = node.config.message || "Workflow completed";

  context.logs.push({
    nodeId: node.id,
    message: `[TODO] Would send notification to ${recipient}: ${message}`,
    timestamp: new Date().toISOString(),
    level: "info",
  });

  return {};
}

/**
 * Execute the built graph
 */
async function executeGraph(
  graph: any,
  initialContext: TwinRunContext,
  config: DigitalTwinConfig
): Promise<TwinRunResult> {
  // Simple sequential execution
  const context = initialContext;
  
  // Find entry node
  let currentNodeId = graph.entryPoint;
  const visitedNodes = new Set<string>();
  
  while (currentNodeId && !visitedNodes.has(currentNodeId)) {
    visitedNodes.add(currentNodeId);
    
    const node = graph.nodes.find((n: DigitalTwinNode) => n.id === currentNodeId);
    if (!node) break;
    
    const handler = createNodeHandler(node, config);
    const updates = await handler(context);
    
    // Apply updates
    Object.assign(context, updates);
    
    // Find next node
    if (node.nextNodes && node.nextNodes.length > 0) {
      currentNodeId = node.nextNodes[0];
    } else if (node.conditions && node.conditions.length > 0) {
      let foundNext = false;
      for (const condition of node.conditions) {
        if (evaluateCondition(condition, context)) {
          currentNodeId = condition.nextNode;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) break;
    } else {
      break;
    }
    
    // Break if pending human
    if (context.status === "pending_human" || context.status === "failed") {
      break;
    }
  }

  const stateChanges = context.stateChanges || [];

  return {
    twinId: context.twin.id,
    runId: crypto.randomUUID(),
    eventId: "event",
    status: context.status === "pending_human" ? "pending_human" : context.status === "failed" ? "failed" : "completed",
    logs: context.logs,
    stateChanges,
    humanTasks: context.humanTasks.length > 0 ? context.humanTasks : undefined,
  };
}

/**
 * Persist a twin run to the database
 */
export async function persistTwinRun(params: {
  twinId: string;
  eventId: string;
  runId: string;
  status: "completed" | "pending_human" | "failed";
  logs: Array<{ nodeId: string; message: string; timestamp: string; level?: string }>;
  stateChanges: any[];
  humanTasks?: Array<{ nodeId: string; role: string; taskId: string; summary: string }>;
}): Promise<void> {
  const { twinId, eventId, runId, status, logs, stateChanges, humanTasks } = params;

  // Get current user ID - for server-side execution, use service role
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // Fallback for service role

  const { error } = await supabase.from("digital_twin_runs").insert({
    twin_id: twinId,
    user_id: userId,
    event_id: eventId,
    run_id: runId,
    status,
    logs: logs as any,
    state_changes: stateChanges as any,
  });

  if (error) {
    logger.error("Failed to persist twin run", error, {
      component: "DigitalTwinRuntime",
      metadata: { twinId, runId },
    });
    throw new Error(`Failed to persist run: ${error.message}`);
  }

  logger.info(`Persisted twin run: ${runId}`, {
    component: "DigitalTwinRuntime",
    metadata: { twinId, status },
  });
}

/**
 * Helper: Evaluate a condition
 */
function evaluateCondition(condition: any, context: TwinRunContext): boolean {
  const fieldValue = getNestedValue(context.state, condition.field);
  return evaluateOperator(fieldValue, condition.operator, condition.value);
}

/**
 * Helper: Evaluate an operator
 */
function evaluateOperator(fieldValue: any, operator: string, compareValue: any): boolean {
  switch (operator) {
    case "eq":
      return fieldValue === compareValue;
    case "ne":
      return fieldValue !== compareValue;
    case "gt":
      return fieldValue > compareValue;
    case "lt":
      return fieldValue < compareValue;
    case "gte":
      return fieldValue >= compareValue;
    case "lte":
      return fieldValue <= compareValue;
    case "contains":
      return String(fieldValue).includes(String(compareValue));
    case "in":
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
    default:
      return false;
  }
}

/**
 * Helper: Get nested value from object
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

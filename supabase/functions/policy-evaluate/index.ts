/**
 * /v1/policy-evaluate
 * 
 * PURPOSE: Evaluate policies for a given action and context
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - action: string (required) - Action to evaluate (e.g., "rag.upload", "gen.request")
 * - target: string (optional) - Target resource
 * - context: object (optional) - Additional context for evaluation
 * 
 * RESPONSE:
 * - decision: string - "allow", "deny", or "warn"
 * - reason: string - Explanation of the decision
 * - context: object - Modified context (e.g., clamped values)
 * - latency_ms: number - Evaluation latency
 * - policies_evaluated: number - Count of policies checked
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  action: z.string().min(1, "Action is required"),
  target: z.string().optional(),
  context: z.record(z.unknown()).optional().default({}),
});

serve(createHandler({
  name: "policy-evaluate",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, action, target, context: inputContext } = input;
    const { supabase, log } = context;

    const evalContext = inputContext || {};
    const startTime = Date.now();

    log("Evaluating policies", { system_id, action });

    // Fetch all enabled policies for this system
    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('*, policy_bindings!inner(*)')
      .eq('system_id', system_id)
      .eq('is_enabled', true);

    if (policiesError) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to fetch policies: ${policiesError.message}`,
        status: 500,
      };
    }

    // Filter policies relevant to this action
    const actionScope = action.split('.')[0];
    const relevantPolicies = policies?.filter((policy: any) => {
      return policy.scope === 'global' || policy.scope === actionScope;
    }) || [];

    let decision = 'allow';
    let reason = 'No blocking policies';
    let violatedPolicy = null;

    // Evaluate each policy rule
    for (const policy of relevantPolicies) {
      const rules = policy.rules as any;

      // Data Residency Check
      if (action.includes('rag.upload') || action.includes('rag.drive')) {
        const region = (evalContext as any).region;
        if (rules.data_residency?.strict && region !== rules.data_residency.region) {
          decision = 'deny';
          reason = `Data residency violation: required region ${rules.data_residency.region}, got ${region || 'unknown'}`;
          violatedPolicy = policy.id;
          break;
        }
      }

      // Retrieval Limits
      if (action === 'rag.retrieval' || action === 'rag.test') {
        const ctx = evalContext as any;
        if (rules.retrieval?.max_topk && ctx.topK > rules.retrieval.max_topk) {
          decision = 'warn';
          reason = `Top-K clamped from ${ctx.topK} to ${rules.retrieval.max_topk} by policy`;
          ctx.topK = rules.retrieval.max_topk; // Auto-clamp
        }

        if (rules.retrieval?.hybrid_required && !ctx.hybrid) {
          decision = 'deny';
          reason = 'Hybrid search required by policy';
          violatedPolicy = policy.id;
          break;
        }

        if (rules.retrieval?.rerank_required && !ctx.rerank) {
          decision = 'warn';
          reason = 'Reranking recommended by policy';
        }
      }

      // Generation Limits
      if (action === 'gen.request') {
        const ctx = evalContext as any;
        if (rules.generation?.max_temperature && ctx.temperature > rules.generation.max_temperature) {
          decision = 'warn';
          reason = `Temperature clamped from ${ctx.temperature} to ${rules.generation.max_temperature} by policy`;
          ctx.temperature = rules.generation.max_temperature;
        }
      }

      // Tool Governance
      if (action === 'mcp.register' || action === 'mcp.call') {
        const ctx = evalContext as any;
        const toolName = ctx.tool_name || target || '';

        // Allowlist check (if defined)
        if (rules.tool_allowlist && rules.tool_allowlist.length > 0) {
          const allowed = rules.tool_allowlist.some((pattern: string) => 
            new RegExp(pattern.replace('*', '.*')).test(toolName)
          );
          if (!allowed) {
            decision = 'deny';
            reason = `Tool "${toolName}" not in allowlist`;
            violatedPolicy = policy.id;
            break;
          }
        }

        // Blocklist check
        if (rules.tool_blocklist && rules.tool_blocklist.length > 0) {
          const blocked = rules.tool_blocklist.some((pattern: string) => 
            new RegExp(pattern.replace('*', '.*')).test(toolName)
          );
          if (blocked) {
            decision = 'deny';
            reason = `Tool "${toolName}" is blocked by policy`;
            violatedPolicy = policy.id;
            break;
          }
        }
      }

      // Review Gates
      if (action === 'deployment.create' || action === 'workflow.publish') {
        if (rules.review_gates?.human_approval?.includes(action.split('.')[1])) {
          const ctx = evalContext as any;
          if (!ctx.approval_token) {
            decision = 'deny';
            reason = 'Human approval required by policy';
            violatedPolicy = policy.id;
            break;
          }
        }
      }

      // Content Filters (PII)
      const ctx = evalContext as any;
      if (rules.pii_redaction?.enabled && ctx.content) {
        // Simple PII detection patterns
        const piiPatterns = {
          credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
          ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
          email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        };

        for (const [type, pattern] of Object.entries(piiPatterns)) {
          if (rules.content_filters?.deny?.includes(type)) {
            const content = String(ctx.content);
            if (pattern.test(content)) {
              if (rules.pii_redaction.mode === 'drop') {
                decision = 'deny';
                reason = `PII detected (${type}): content blocked by policy`;
                violatedPolicy = policy.id;
                break;
              } else {
                decision = 'warn';
                reason = `PII detected (${type}): content will be masked`;
                // Apply masking
                ctx.content = content.replace(pattern, '***REDACTED***');
              }
            }
          }
        }
        if (decision === 'deny') break;
      }
    }

    const latency = Date.now() - startTime;

    // Log to audit
    if (relevantPolicies.some((p: any) => (p.rules as any).logging?.audit_enabled)) {
      await supabase.from('policy_audit').insert({
        system_id,
        policy_id: violatedPolicy,
        action,
        target,
        decision,
        reason,
        latency_ms: latency,
        metadata: (relevantPolicies[0]?.rules as any)?.logging?.details === 'full' ? evalContext : {}
      });
    }

    log("Policy evaluation complete", { decision, latency });

    return {
      decision,
      reason,
      context: evalContext,
      latency_ms: latency,
      policies_evaluated: relevantPolicies.length
    };
  }
}));

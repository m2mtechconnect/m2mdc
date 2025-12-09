/**
 * /v1/policy-validate
 * 
 * PURPOSE: Validate policy configuration and check for conflicts
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - policy_id: string (optional) - Specific policy to validate
 * 
 * RESPONSE:
 * - ok: boolean - True if no issues found
 * - issues: string[] - Array of validation issues
 * - validated_at: string - ISO timestamp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  policy_id: z.string().uuid().optional(),
});

serve(createHandler({
  name: "policy-validate",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, policy_id } = input;
    const { supabase, log } = context;

    const issues: string[] = [];

    log("Validating policies", { system_id, policy_id });

    // If specific policy, validate it
    if (policy_id) {
      const { data: policy, error: policyError } = await supabase
        .from('policies')
        .select('*, policy_bindings(*)')
        .eq('id', policy_id)
        .single();

      if (policyError || !policy) {
        throw {
          code: ErrorCodes.NOT_FOUND,
          message: 'Policy not found',
          status: 404,
        };
      }

      // Validate rules structure
      const rules = policy.rules as any;

      if (rules.retrieval?.max_topk && (rules.retrieval.max_topk < 1 || rules.retrieval.max_topk > 50)) {
        issues.push('Max Top-K must be between 1 and 50');
      }

      if (rules.generation?.max_temperature && (rules.generation.max_temperature < 0 || rules.generation.max_temperature > 1)) {
        issues.push('Max temperature must be between 0.0 and 1.0');
      }

      if (rules.tool_allowlist && rules.tool_blocklist) {
        const allowlist = new Set(rules.tool_allowlist);
        const blocklist = new Set(rules.tool_blocklist);
        const overlap = [...allowlist].filter(x => blocklist.has(x));
        if (overlap.length > 0) {
          issues.push(`Tools appear in both allowlist and blocklist: ${overlap.join(', ')}`);
        }
      }

      // Validate bindings
      if (policy.policy_bindings && policy.policy_bindings.length === 0) {
        issues.push('Warning: Policy has no bindings (will not be enforced)');
      }

    } else {
      // Validate all policies for this system
      const { data: policies, error: policiesError } = await supabase
        .from('policies')
        .select('*, policy_bindings(*)')
        .eq('system_id', system_id);

      if (policiesError) {
        throw {
          code: ErrorCodes.INTERNAL_ERROR,
          message: `Failed to fetch policies: ${policiesError.message}`,
          status: 500,
        };
      }

      // Check for conflicting policies
      const enabledPolicies = policies?.filter((p: any) => p.is_enabled) || [];
      
      if (enabledPolicies.length === 0) {
        issues.push('Warning: No enabled policies for this system');
      }

      // Check for conflicting data residency requirements
      const residencyPolicies = enabledPolicies
        .filter((p: any) => (p.rules as any).data_residency?.strict)
        .map((p: any) => (p.rules as any).data_residency.region);
      
      if (new Set(residencyPolicies).size > 1) {
        issues.push(`Conflicting data residency requirements: ${[...new Set(residencyPolicies)].join(', ')}`);
      }

      // Check for policies without bindings
      const unboundPolicies = enabledPolicies.filter((p: any) => !p.policy_bindings || p.policy_bindings.length === 0);
      if (unboundPolicies.length > 0) {
        issues.push(`${unboundPolicies.length} enabled policies have no bindings: ${unboundPolicies.map((p: any) => p.name).join(', ')}`);
      }
    }

    log("Validation complete", { issuesCount: issues.length });

    return {
      ok: issues.length === 0,
      issues,
      validated_at: new Date().toISOString()
    };
  }
}));

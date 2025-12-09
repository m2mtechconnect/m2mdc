/**
 * /v1/systems-delete
 * 
 * PURPOSE: Delete an AI system with cascading cleanup
 * AUTH: user (requires valid JWT token, system ownership)
 * 
 * REQUEST:
 * - systemId: string (required, system to delete)
 * 
 * RESPONSE:
 * - systemId: Deleted system ID
 * - systemName: Deleted system name
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  systemId: z.string().uuid("Invalid system ID"),
});

serve(createHandler({
  name: "systems-delete",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { systemId } = input;
    const { supabase, userId, log } = context;

    log("Delete request", { systemId });

    // Verify system exists and user owns it
    const { data: system, error: systemError } = await supabase
      .from('agents')
      .select('id, name, status, owner_id')
      .eq('id', systemId)
      .maybeSingle();

    if (systemError) {
      log("Fetch error", { error: systemError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch system',
        status: 500,
      };
    }

    if (!system) {
      log("System not found", { systemId });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'System not found',
        status: 404,
      };
    }

    if (system.owner_id !== userId) {
      log("Unauthorized delete attempt", { systemId, ownerId: system.owner_id });
      throw {
        code: ErrorCodes.FORBIDDEN,
        message: 'Unauthorized to delete this system',
        status: 403,
      };
    }

    // Check if system is active
    if (system.status === 'active') {
      log("Cannot delete active system", { systemId, status: system.status });
      throw {
        code: ErrorCodes.CONFLICT,
        message: 'Cannot delete an active system. Please stop it first.',
        status: 400,
      };
    }

    log("Starting cascading delete");

    // Delete related records (non-blocking for performance)
    const deletePromises = [
      supabase.from('agent_conversations').delete().eq('agent_id', systemId),
      supabase.from('agent_runs').delete().eq('agent_id', systemId),
      supabase.from('agent_exports').delete().eq('agent_id', systemId),
      supabase.from('deployments').delete().eq('system_id', systemId),
      supabase.from('roi_assumptions').delete().eq('system_id', systemId),
      supabase.from('roi_snapshots').delete().eq('system_id', systemId),
      supabase.from('system_integrations').delete().eq('system_id', systemId),
      supabase.from('system_builder_state').delete().eq('system_id', systemId),
    ];

    // Wait for all deletes to complete
    await Promise.allSettled(deletePromises);

    // Handle workflows separately due to nested structure
    const { data: workflows } = await supabase
      .from('workflows')
      .select('id')
      .eq('system_id', systemId);

    if (workflows && workflows.length > 0) {
      const workflowIds = workflows.map((w: any) => w.id);
      
      // Delete workflow-related data
      await Promise.allSettled([
        supabase.from('workflow_nodes').delete().in('workflow_id', workflowIds),
        supabase.from('workflow_edges').delete().in('workflow_id', workflowIds),
      ]);

      // Get workflow runs to delete their events
      const { data: workflowRuns } = await supabase
        .from('workflow_runs')
        .select('id')
        .in('workflow_id', workflowIds);

      if (workflowRuns && workflowRuns.length > 0) {
        const runIds = workflowRuns.map((r: any) => r.id);
        await supabase.from('workflow_run_events').delete().in('run_id', runIds);
        await supabase.from('workflow_runs').delete().in('workflow_id', workflowIds);
      }

      // Delete workflows
      await supabase.from('workflows').delete().eq('system_id', systemId);
    }

    log("Cascading delete completed, deleting system");

    // Finally, delete the system itself
    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', systemId);

    if (deleteError) {
      log("System deletion failed", { error: deleteError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to delete system',
        status: 500,
      };
    }

    log("System deleted successfully", { systemId, systemName: system.name });

    return {
      systemId,
      systemName: system.name,
      message: 'System deleted successfully',
    };
  }
}));

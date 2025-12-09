/**
 * /v1/agent-export
 * 
 * PURPOSE: Export agent conversation data
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agentId: string (required, UUID)
 * - conversationId: string (required, UUID)
 * - exportType: string (optional: json, csv, pdf; default: json)
 * 
 * RESPONSE:
 * - File download with appropriate Content-Type
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  conversationId: z.string().uuid("Invalid conversation ID"),
  exportType: z.enum(['json', 'csv', 'pdf']).optional().default('json'),
});

serve(createHandler({
  name: "agent-export",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, conversationId, exportType } = input;
    const { supabase, userId, log } = context;

    log("Exporting agent data", { agentId, conversationId, exportType });

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'Agent not found',
        status: 404,
      };
    }

    // Get conversation and messages
    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    const { data: messages } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Get runs
    const { data: runs } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('agent_exports')
      .insert({
        agent_id: agentId,
        user_id: userId,
        export_type: exportType,
        status: 'processing',
        metadata: {
          conversation_id: conversationId,
          message_count: messages?.length || 0,
          run_count: runs?.length || 0,
        },
      })
      .select()
      .single();

    if (exportError) throw exportError;

    // Generate export based on type
    let exportData;
    let contentType;
    let fileName;

    switch (exportType) {
      case 'json':
        exportData = JSON.stringify({
          agent,
          conversation,
          messages,
          runs,
          exported_at: new Date().toISOString(),
        }, null, 2);
        contentType = 'application/json';
        fileName = `agent-${agentId}-export-${Date.now()}.json`;
        break;

      case 'csv':
        // CSV export of messages
        const csvHeader = 'Timestamp,Role,Content\n';
        const csvRows = messages?.map((msg: any) => 
          `"${msg.created_at}","${msg.role}","${msg.content.replace(/"/g, '""')}"`
        ).join('\n') || '';
        exportData = csvHeader + csvRows;
        contentType = 'text/csv';
        fileName = `agent-${agentId}-messages-${Date.now()}.csv`;
        break;

      case 'pdf':
        // For PDF, return JSON with metadata for now
        exportData = JSON.stringify({
          message: 'PDF generation in progress',
          agent,
          conversation,
          messages,
        });
        contentType = 'application/json';
        fileName = `agent-${agentId}-report-${Date.now()}.pdf`;
        break;

      default:
        throw {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Unsupported export type',
          status: 400,
        };
    }

    // Update export record as completed (non-blocking)
    void supabase
      .from('agent_exports')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...exportRecord.metadata,
          file_name: fileName,
          file_size: exportData.length,
        },
      })
      .eq('id', exportRecord.id);

    log("Export completed", { fileName, size: exportData.length });

    return {
      exportData,
      contentType,
      fileName,
    };
  }
}));

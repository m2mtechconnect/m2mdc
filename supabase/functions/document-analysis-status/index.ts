/**
 * /v1/document-analysis-status
 * 
 * PURPOSE: Check status of background document analysis job
 * 
 * AUTH: required
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  jobId: z.string().uuid("Invalid job ID format"),
});

serve(createHandler({
  name: "document-analysis-status",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { jobId } = input;
    const { supabase, userId, log } = context;

    // Validate jobId is present (schema already validates format)
    if (!jobId) {
      log("Missing jobId in request");
      throw {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "jobId is required",
        status: 400,
      };
    }

    log("Checking job status", { jobId, userId });

    const { data: job, error } = await supabase
      .from("document_analysis_jobs")
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error) {
      log("Database error retrieving job", { jobId, error });
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "Failed to retrieve job status",
        status: 500,
      };
    }

    if (!job) {
      log("Job not found", { jobId, userId });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: "Job not found or access denied",
        status: 404,
      };
    }

    log("Job status retrieved", { jobId, status: job.status, progress: job.progress });

    return {
      job_id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
      progress_message: job.progress_message || "",
      result: job.result,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at,
    };
  }
}));

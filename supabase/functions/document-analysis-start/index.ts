/**
 * /v1/document-analysis-start
 * 
 * PURPOSE: Phase 1 - Simple document job creation
 * - Create job record
 * - Extract basic text info
 * - Return stub result (no AI yet)
 * 
 * AUTH: required
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";
import { extractTextFromDocument } from "../_shared/document/extractTextFromDocument.ts";
import { geminiAnalyzeDocument } from "../_shared/llm/geminiAnalyzeDocument.ts";

const MAX_FILE_SIZE_MB = 25;

const InputSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileContent: z.string().min(1, "File content is required"),
  fileType: z.string().optional(),
  source: z.enum(["dashboard", "builder"]).optional(),
  agentId: z.string().uuid().optional(),
});

serve(createHandler({
  name: "document-analysis-start",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { fileName, fileContent, fileType, source } = input;
    const { supabase, userId, log } = context;

    log("Document upload received", { 
      fileName, 
      fileType,
      source: source || 'dashboard',
      contentLength: fileContent.length 
    });

    // Validate file size
    const fileSizeMB = fileContent.length / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw {
        code: ErrorCodes.VALIDATION_ERROR,
        message: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum ${MAX_FILE_SIZE_MB}MB allowed.`,
        status: 400,
      };
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("document_analysis_jobs")
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType || 'unknown',
        status: 'queued',
        stage: 'queued',
        progress: 0,
        progress_message: 'Job created',
      })
      .select()
      .single();

    if (jobError || !job) {
      log("Failed to create job", { error: jobError });
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "Failed to create analysis job",
        status: 500,
      };
    }

    log("Job created", { jobId: job.id });

    // Process synchronously with real extraction + Gemini analysis
    try {
      // Step 1: Update to processing
      const { error: updateError1 } = await supabase
        .from("document_analysis_jobs")
        .update({
          status: 'processing',
          progress: 10,
          progress_message: 'Extracting text from document...'
        })
        .eq('id', job.id);

      if (updateError1) {
        log("Failed to update job status to processing", { error: updateError1 });
        throw new Error(`Database update failed: ${updateError1.message}`);
      }

      // Step 2: Extract text
      log("Extracting text", { jobId: job.id, contentLength: fileContent?.length });
      const extraction = await extractTextFromDocument(fileContent, fileName, fileType);
      log("Extraction result", { charCount: extraction.charCount, truncated: extraction.truncated });

      if (!extraction.text || extraction.charCount === 0) {
        // No text extracted - unsupported or corrupt file
        log("Extraction failed - no text", { jobId: job.id });
        const { error: updateError2 } = await supabase
          .from("document_analysis_jobs")
          .update({
            status: 'failed',
            progress: 100,
            error_message: 'Unable to extract text from this document. Please ensure the file is not corrupted and is a supported format (PDF, Word, Excel, PowerPoint, or text file).'
          })
          .eq('id', job.id);

        if (updateError2) {
          log("Failed to update job as failed", { error: updateError2 });
        }

        return {
          success: true,
          job_id: job.id,
          status: 'failed',
          message: 'Could not extract text from document'
        };
      }

      log("Text extracted successfully", { 
        jobId: job.id, 
        charCount: extraction.charCount,
        truncated: extraction.truncated 
      });

      // Update with extraction complete
      const { error: updateError3 } = await supabase
        .from("document_analysis_jobs")
        .update({
          progress: 30,
          progress_message: 'Text extracted. Analyzing with AI...',
          raw_text: extraction.text,
          char_count: extraction.charCount,
          page_count: extraction.metadata?.pageCount || 1,
          truncated: extraction.truncated || false,
          extraction_method: 'enhanced'
        })
        .eq('id', job.id);

      if (updateError3) {
        log("Failed to update extraction progress", { error: updateError3 });
        throw new Error(`Database update failed: ${updateError3.message}`);
      }

      // Step 3: Gemini analysis
      log("Starting Gemini analysis", { jobId: job.id });
      const analysis = await geminiAnalyzeDocument({
        text: extraction.text,
        fileName,
        charCount: extraction.charCount,
        charCountTotal: extraction.charCountTotal,
        truncated: extraction.truncated
      });

      log("Gemini analysis complete", { jobId: job.id });

      // Step 4: Update job with completion
      const { error: updateError4 } = await supabase
        .from("document_analysis_jobs")
        .update({
          status: 'completed',
          progress: 100,
          progress_message: 'Analysis complete',
          model_used: 'gemini-2.5-flash',
          result: {
            fileSummary: {
              outline: analysis.outline,
              keySections: analysis.keySections,
              mainSummary: analysis.mainSummary,
              entities: analysis.entities,
              domainGuess: analysis.domainGuess,
              recommendedTwinTypes: analysis.recommendedTwinTypes
            },
            extraction: {
              charCount: extraction.charCount,
              charCountTotal: extraction.charCountTotal,
              truncated: extraction.truncated,
              metadata: extraction.metadata
            },
            builderPrefill: analysis.builderPrefill,
            powered_by: 'Gemini 2.5 Flash + Document Chunking',
            analysis_timestamp: new Date().toISOString()
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError4) {
        log("Failed to mark job as completed", { error: updateError4 });
        throw new Error(`Failed to save results: ${updateError4.message}`);
      }

      log("Job completed successfully", { jobId: job.id });
    } catch (error: any) {
      log("Error processing job", { error: error.message || error, stack: error.stack });
      
      // Determine error message
      let errorMessage = 'Document analysis failed';
      if (error.message === 'GEMINI_NOT_CONFIGURED') {
        errorMessage = 'AI analysis is not configured. Please contact your administrator.';
      } else if (error.message?.includes('Rate limit')) {
        errorMessage = 'AI rate limit exceeded. Please try again in a few moments.';
      } else if (error.message?.includes('credits')) {
        errorMessage = 'AI credits exhausted. Please add credits to continue.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const { error: updateError5 } = await supabase
        .from("document_analysis_jobs")
        .update({
          status: 'failed',
          progress: 100,
          error_message: errorMessage
        })
        .eq('id', job.id);

      if (updateError5) {
        log("Failed to update job with error state", { error: updateError5 });
      }
    }

    // Return job ID immediately
    return {
      success: true,
      job_id: job.id,
      status: 'queued',
      message: 'Document received - analyzing now...'
    };
  }
}));

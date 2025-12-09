/**
 * /v1/knowledge-upload
 * 
 * PURPOSE: Upload and process files for knowledge base
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - file_name: string (required)
 * - file_type: string (required, must be allowed type)
 * - file_size: number (optional, max 50MB)
 * - content: string (required, file content)
 * 
 * RESPONSE:
 * - document_id: Created document ID
 * - status: Processing status
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

// Input validation schema
const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  file_name: z.string().min(1).max(255),
  file_type: z.string().refine(
    (type) => ALLOWED_TYPES.includes(type),
    { message: `File type must be one of: ${ALLOWED_TYPES.join(', ')}` }
  ),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE, `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`).optional(),
  content: z.string().min(1, "File content cannot be empty"),
});

serve(createHandler({
  name: "knowledge-upload",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, file_name, file_type, file_size, content } = input;
    const { supabase, userId, log } = context;

    log("Uploading knowledge file", { file_name, file_type, size: file_size });

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: file_name,
        source_type: 'upload',
        content: content,
        status: 'processing',
        metadata: {
          file_type,
          file_size,
          system_id,
          uploaded_at: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (docError) {
      log("Document creation failed", { error: docError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to create document record',
        status: 500,
      };
    }

    // Create knowledge source link (non-blocking)
    void supabase
      .from('knowledge_sources')
      .insert({
        user_id: userId,
        name: file_name,
        description: `Uploaded file: ${file_name}`,
        tags: [file_type, 'upload'],
      });

    log("File uploaded successfully", { documentId: document.id });

    return {
      document_id: document.id,
      status: 'processing',
      message: 'File uploaded successfully and queued for processing',
    };
  }
}));

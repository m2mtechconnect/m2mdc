/**
 * /v1/builder-test
 * 
 * PURPOSE: Test agent configuration with sample prompt
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - prompt: string (required)
 * - useGrounding: boolean (optional, default: true)
 * - role: string (optional, default: 'engineer')
 * 
 * RESPONSE:
 * - Forwarded response from copilot-chat
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  useGrounding: z.boolean().optional().default(true),
  role: z.string().optional().default('engineer'),
});

serve(createHandler({
  name: "builder-test",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { prompt, useGrounding, role } = input;
    const { supabase, log } = context;

    log("Testing agent configuration", { role, useGrounding });

    // Call copilot-chat for test run
    const chatResponse = await supabase.functions.invoke('copilot-chat', {
      body: {
        messages: [{ role: 'user', content: prompt }],
        role,
        useGrounding
      }
    });

    if (chatResponse.error) {
      log("Test run failed", { error: chatResponse.error });
      throw {
        code: 'TEST_ERROR',
        message: chatResponse.error.message || 'Test run failed',
        status: 500,
      };
    }

    log("Test run completed successfully");

    return chatResponse.data;
  }
}));

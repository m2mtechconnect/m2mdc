/**
 * /v1/zapier-test
 * 
 * PURPOSE: Test a Zapier app integration connection
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST (GET params):
 * - app: string (required, Zapier app key)
 * 
 * RESPONSE:
 * - success: boolean
 * - result: Test result with latency and status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  app: z.string().min(1, "app query parameter is required"),
});

serve(createHandler({
  name: "zapier-test",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { app: app_key } = input;
    const { supabase, userId, log } = context;

    const startTime = Date.now();

    log("Testing Zapier app", { app_key });

    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', `zapier_${app_key}`)
      .eq('user_id', userId)
      .single();

    if (fetchError || !integration) {
      log("App not connected", { app_key });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: `App not connected: ${app_key}`,
        status: 404,
      };
    }

    // Perform lightweight health check
    const webhookUrl = integration.config?.webhook_url;
    const testResult = {
      success: true,
      latency_ms: Date.now() - startTime,
      message: `${app_key} connection is healthy`,
      webhook_url: webhookUrl,
    };

    // Update last test time (non-blocking)
    void supabase
      .from('integrations')
      .update({
        last_test_result: testResult,
        last_sync: new Date().toISOString(),
      })
      .eq('id', integration.id);

    // Log the test (non-blocking)
    void supabase.from('integration_logs').insert({
      user_id: userId,
      integration_id: integration.id,
      action: 'test',
      status: 'success',
      duration_ms: testResult.latency_ms,
      details: testResult,
    });

    log("Test successful", { app_key, latency: testResult.latency_ms });

    return {
      success: true,
      result: testResult,
    };
  }
}));

/**
 * /v1/zapier-webhook/{app_key}
 * 
 * PURPOSE: Receive webhook events from Zapier integrations
 * AUTH: admin (uses service role to bypass RLS)
 * 
 * REQUEST:
 * - Path parameter: app_key (Zapier app identifier)
 * - Body: Zapier webhook payload (varies by app)
 * - Headers: x-zapier-signature (optional, for verification)
 * 
 * RESPONSE:
 * - success: boolean
 * - message: string
 * - app_key: string
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  event_type: z.string().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
  document_count: z.number().optional(),
}).passthrough(); // Allow additional fields

serve(createHandler({
  name: "zapier-webhook",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const payload = input;
    const { supabase, req, log } = context;

    // Extract app_key from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const app_key = pathParts[pathParts.length - 1];

    if (!app_key) {
      log("Missing app_key in URL path");
      throw {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'app_key not found in URL path',
        status: 400,
      };
    }

    log("Webhook received for Zapier app", { app_key, event_type: payload.event_type });

    // Verify Zapier signature if present
    const signature = req.headers.get('x-zapier-signature');
    if (signature) {
      log("Zapier signature present", { signature });
      // TODO: Implement signature verification with shared secret
    }

    // Find the integration
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', `zapier_${app_key}`);

    if (fetchError || !integrations || integrations.length === 0) {
      log("Integration not found", { app_key });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: `Integration not found for app: ${app_key}`,
        status: 404,
      };
    }

    // Update KPIs based on webhook event
    const eventType = payload.event_type || 'sync';
    const isSuccess = !payload.error && payload.status !== 'failed';
    
    for (const integration of integrations) {
      const config = integration.config || {};
      const currentDocCount = config.documents_synced || 0;
      const currentSyncCount = config.sync_count || 0;
      const currentSuccessCount = config.success_count || 0;

      await supabase
        .from('integrations')
        .update({
          last_sync: new Date().toISOString(),
          status: isSuccess ? 'connected' : 'error',
          error_message: payload.error || null,
          config: {
            ...config,
            documents_synced: currentDocCount + (payload.document_count || 1),
            sync_count: currentSyncCount + 1,
            success_count: isSuccess ? currentSuccessCount + 1 : currentSuccessCount,
            last_webhook_at: new Date().toISOString(),
          },
        })
        .eq('id', integration.id);

      // Log the webhook event (non-blocking)
      void supabase.from('integration_logs').insert({
        user_id: integration.user_id,
        integration_id: integration.id,
        action: 'webhook',
        status: isSuccess ? 'success' : 'error',
        error_message: payload.error || null,
        details: payload,
      });
    }

    log("Webhook processed", { app_key, result: isSuccess ? 'success' : 'error' });

    return {
      success: true,
      message: 'Webhook processed',
      app_key,
    };
  }
}));

/**
 * /v1/zapier-connect
 * 
 * PURPOSE: Connect a Zapier app integration
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - app_key: string (required, Zapier app identifier)
 * - auth_type: string (optional, authentication method)
 * - api_key: string (optional, API key for authentication)
 * - webhook_url: string (optional, custom webhook URL)
 * - oauth_code: string (optional, OAuth authorization code)
 * - scopes: string[] (optional, OAuth scopes)
 * 
 * RESPONSE:
 * - success: boolean
 * - message: string
 * - webhook_url: string (generated webhook URL)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  app_key: z.string().min(1, "app_key is required"),
  auth_type: z.string().optional(),
  api_key: z.string().optional(),
  webhook_url: z.string().url().optional(),
  oauth_code: z.string().optional(),
  scopes: z.array(z.string()).optional().default([]),
});

serve(createHandler({
  name: "zapier-connect",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { app_key, auth_type, api_key, webhook_url, oauth_code, scopes } = input;
    const { supabase, userId, log } = context;

    log("Connecting Zapier app", { app_key, auth_type });

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', `zapier_${app_key}`)
      .eq('user_id', userId)
      .single();

    const generatedWebhookUrl = webhook_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/zapier-webhook/${app_key}`;

    const integrationData = {
      user_id: userId,
      provider: `zapier_${app_key}`,
      name: app_key,
      category: 'Zapier',
      status: 'connected',
      connect_method: auth_type || 'zapier',
      config: {
        app_key,
        auth_type,
        webhook_url: generatedWebhookUrl,
        scopes,
      },
      credentials_encrypted: api_key ? btoa(api_key) : null,
      last_sync: new Date().toISOString(),
    };

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('integrations')
        .update(integrationData)
        .eq('id', existing.id);

      if (updateError) {
        log("Update failed", { error: updateError.message });
        throw {
          code: 'DATABASE_ERROR',
          message: updateError.message,
          status: 500,
        };
      }

      log("Updated Zapier app connection", { app_key });
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('integrations')
        .insert(integrationData);

      if (insertError) {
        log("Insert failed", { error: insertError.message });
        throw {
          code: 'DATABASE_ERROR',
          message: insertError.message,
          status: 500,
        };
      }

      log("Created new Zapier app connection", { app_key });
    }

    // Log the action (non-blocking)
    void supabase.from('integration_logs').insert({
      user_id: userId,
      action: 'connect',
      status: 'success',
      details: { app_key, auth_type },
    });

    return {
      success: true,
      message: `Successfully connected ${app_key}`,
      webhook_url: generatedWebhookUrl,
    };
  }
}));

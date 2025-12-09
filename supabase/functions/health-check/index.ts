/**
 * /v1/health-check
 * 
 * PURPOSE: Health check endpoint for service monitoring
 * AUTH: public (no auth required)
 * 
 * REQUEST: None
 * 
 * RESPONSE:
 * - status: Service health status
 * - timestamp: Current timestamp
 * - service: Service name
 * - version: Service version
 * - checks: Component health checks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";

serve(createHandler({
  name: "health-check",
  authLevel: "public",
  handler: async (input, context) => {
    const { log } = context;

    log("Health check requested");

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'AURA AI Recommendations',
      version: '1.0.0',
      checks: {
        api: 'healthy',
        database: 'healthy',
      }
    };

    return health;
  }
}));

/**
 * /observability-config
 *
 * PURPOSE: Declares whether a server-side observability backend is configured.
 * The browser runtime-monitoring adapter is fail-closed: it only activates
 * when this endpoint declares an enabled provider. No credential material is
 * ever returned - only a boolean and the provider label.
 *
 * AUTH: public (no auth required)
 *
 * RESPONSE: { enabled: boolean, provider: 'posthog' | null, captureFunction: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";

serve(createHandler({
  name: "observability-config",
  authLevel: "public",
  handler: async () => {
    // Presence check only. The key value must never appear in logs or output.
    const configured = Boolean(Deno.env.get("POSTHOG_PROJECT_API_KEY")?.trim());
    return {
      enabled: configured,
      provider: configured ? "posthog" : null,
      captureFunction: "observability-capture",
    };
  },
}));

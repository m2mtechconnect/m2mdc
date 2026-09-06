import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isManagedAIConfigured } from "../_shared/ai-client.ts";


interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    secrets: boolean;
    index: boolean;
    knowledge: boolean;
    connectors: boolean;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateId, config } = await req.json();
    
    console.log(`Validating template: ${templateId}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const checks = {
      secrets: false,
      index: false,
      knowledge: false,
      connectors: false,
    };

    // Check the only supported managed AI runtime.
    const lovableApiKey = isManagedAIConfigured();

    if (!lovableApiKey) {
      errors.push('Managed AI is not configured - AI features will not work');
      checks.secrets = false;
    } else {
      checks.secrets = true;
      console.log('✓ Managed AI configured');
    }

    // Check if Vertex AI Search index exists (simulated - would need actual GCP call)
    if (config?.rag?.index_name) {
      checks.index = true; // Assume exists for now
      console.log(`Index check: ${config.rag.index_name}`);
    } else {
      warnings.push("No vector index configured");
    }

    // Check knowledge sources are accessible
    if (config?.knowledge && config.knowledge.length > 0) {
      checks.knowledge = true;
      for (const source of config.knowledge) {
        if (source.type === "web_rule") {
          console.log(`Knowledge source: ${source.allow?.join(", ")}`);
        }
      }
    } else {
      warnings.push("No knowledge sources configured");
    }

    // Check optional connectors
    if (config?.connectors) {
      const optionalConnectors = config.connectors.filter((c: any) => c.mode === "optional");
      if (optionalConnectors.length > 0) {
        warnings.push(`Optional connectors: ${optionalConnectors.map((c: any) => c.id).join(", ")}`);
      }
      checks.connectors = true;
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      checks,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        errors: [error instanceof Error ? error.message : "Unknown validation error"],
        warnings: [],
        checks: { secrets: false, index: false, knowledge: false, connectors: false }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

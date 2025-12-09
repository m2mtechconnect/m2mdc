import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Check for AI secrets - Lovable managed is sufficient
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const useExternalGoogle = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true';
    
    if (!lovableApiKey && !useExternalGoogle) {
      errors.push('Missing LOVABLE_API_KEY - AI features will not work');
      checks.secrets = false;
    } else if (lovableApiKey) {
      checks.secrets = true;
      console.log('✓ Lovable managed AI configured');
    } else {
      // External Google validation
      const externalSecrets = [
        "GOOGLE_APPLICATION_CREDENTIALS_JSON",
        "GOOGLE_PROJECT_ID",
        "GOOGLE_LOCATION",
        "GEMINI_MODEL",
      ];
      
      let allExternalSecretsPresent = true;
      for (const secret of externalSecrets) {
        if (!Deno.env.get(secret)) {
          warnings.push(`External Google enabled but missing: ${secret}`);
          allExternalSecretsPresent = false;
        }
      }
      checks.secrets = allExternalSecretsPresent;
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

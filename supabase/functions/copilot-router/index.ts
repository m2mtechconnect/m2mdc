import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoPilotRequest {
  query: string;
  context: {
    page: string;
    agentId?: string;
    agentName?: string;
    category?: string;
    industry?: string;
    templateId?: string;
    workflowId?: string;
    builderStep?: number;
  };
  action?: 'answer' | 'create-agent' | 'update-agent' | 'generate-workflow' | 'run-simulation' | 'suggest-improvement';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Co-Pilot Router request started`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { query, context, action = 'answer' }: CoPilotRequest = await req.json();

    // Build context-aware system prompt
    let systemPrompt = `You are AURA Co-Pilot, an AI assistant for enterprise automation and AI agent development.`;
    
    // Add page-specific context
    if (context.page === 'builder') {
      systemPrompt += `\n\nYou are helping the user build an AI agent. Current step: ${context.builderStep || 1}/5.`;
      systemPrompt += `\nProvide specific guidance on agent configuration, workflows, and intelligence setup.`;
    } else if (context.page === 'agent-operations-center') {
      systemPrompt += `\n\nYou are helping monitor and manage agent "${context.agentName}" (ID: ${context.agentId}).`;
      systemPrompt += `\nProvide operational insights, debugging help, and performance optimization suggestions.`;
    } else if (context.page === 'workflow-editor') {
      systemPrompt += `\n\nYou are helping design and edit workflows.`;
      systemPrompt += `\nProvide workflow suggestions, trigger configurations, and integration recommendations.`;
    } else if (context.page === 'simulation') {
      systemPrompt += `\n\nYou are helping create and run simulations.`;
      systemPrompt += `\nGenerate realistic test scenarios and mock data for validation.`;
    } else if (context.page === 'template-library') {
      systemPrompt += `\n\nYou are helping the user find and customize templates.`;
      systemPrompt += `\nRecommend templates based on their industry and use case.`;
    } else if (context.page === 'playbook') {
      systemPrompt += `\n\nYou are helping the user understand implementation strategies.`;
      systemPrompt += `\nProvide roadmap guidance, ROI calculations, and best practices.`;
    }

    // Add industry context
    if (context.industry) {
      systemPrompt += `\n\nIndustry context: ${context.industry}`;
      systemPrompt += `\nTailor your responses to ${context.industry} industry requirements and regulations.`;
    }

    // Add category context
    if (context.category) {
      systemPrompt += `\n\nAgent category: ${context.category}`;
    }

    // Route to appropriate handler based on action
    if (action === 'answer') {
      // Standard Q&A using Lovable AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      // ENFORCE GEMINI 3.X MODEL
      const gemini3Model = "google/gemini-3-pro-preview";
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: gemini3Model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] AI API error:`, response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      console.log(`[${requestId}] Response generated`);

      return new Response(
        JSON.stringify({
          answer: content,
          context: context,
          suggestions: generateSuggestions(context),
          requestId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === 'generate-workflow') {
      // Generate workflow JSON
      // TODO: Implement workflow generation logic
      return new Response(
        JSON.stringify({
          workflow: {},
          message: 'Workflow generation coming soon',
          requestId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === 'run-simulation') {
      // Trigger simulation
      // TODO: Implement simulation trigger
      return new Response(
        JSON.stringify({
          simulationId: crypto.randomUUID(),
          message: 'Simulation started',
          requestId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unsupported action: ${action}`);

  } catch (error) {
    console.error('Co-Pilot Router error:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stage: 'router'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateSuggestions(context: any): string[] {
  const suggestions: string[] = [];
  
  if (context.page === 'builder') {
    suggestions.push('What integrations should I add?');
    suggestions.push('Generate a workflow for me');
    suggestions.push('Suggest KPIs for tracking');
  } else if (context.page === 'agent-operations-center') {
    suggestions.push('How can I improve performance?');
    suggestions.push('Show recent errors');
    suggestions.push('Suggest optimization strategies');
  } else if (context.page === 'simulation') {
    suggestions.push('Generate test scenarios');
    suggestions.push('Create realistic mock data');
    suggestions.push('Validate workflow logic');
  } else {
    suggestions.push('Help me get started');
    suggestions.push('Show me examples');
    suggestions.push('What can you help me with?');
  }
  
  return suggestions;
}

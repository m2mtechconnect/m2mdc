import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Co-Pilot chat request started`);

  try {
    const { messages, role } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format", stage: "validation" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build role-aware system prompt
    const rolePrompts = {
      Executive: "Prioritize ROI, risk, compliance, time-to-value. Use bulleted answers.",
      Manager: "Prioritize workflow steps, owners, timelines, blockers.",
      Engineer: "Provide technical steps, logs, APIs, and pseudo-code when helpful."
    };

    const systemPrompt = `You are M2M Co-Pilot, an AI assistant for enterprise automation and workflows.\n\n${rolePrompts[role as keyof typeof rolePrompts] || 'Provide clear, actionable guidance.'}`;

    // Convert messages to Lovable AI format
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    console.log(`[${requestId}] Calling Lovable AI with ${messages.length} messages`);
    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: formattedMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] AI API error:`, response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment.",
            stage: "generate",
            requestId
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required. Please add credits to your workspace.",
            stage: "generate",
            requestId
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    const latency = Date.now() - startTime;

    console.log(`[${requestId}] Response generated in ${latency}ms`);

    return new Response(
      JSON.stringify({
        text: content,
        metrics: {
          latency_ms: latency,
          model: "gemini-2.5-flash",
          grounded: false
        },
        requestId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stage: "generate",
        requestId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

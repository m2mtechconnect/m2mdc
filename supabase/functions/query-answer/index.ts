import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();
    
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing query:", query);
    const startTime = Date.now();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve relevant context from indexed content
    // For now, simple keyword search - in production would use vector similarity
    const { data: searchResults, error: searchError } = await supabase
      .from("indexed_content")
      .select("id, title, content, source_type, source_name, url, metadata")
      .textSearch("content", query.split(" ").join(" | "), {
        type: "websearch",
        config: "english",
      })
      .limit(6);

    if (searchError) {
      console.error("Search error:", searchError);
    }

    const sources = searchResults || [];
    console.log(`Found ${sources.length} relevant sources`);

    // Build context for AI
    const contextText = sources
      .map((s, i) => `[${i + 1}] ${s.title}\nSource: ${s.source_name}\n${s.content.substring(0, 500)}...`)
      .join("\n\n");

    // Generate answer with Gemini Pro
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant with access to a knowledge base. Answer user questions based on the provided context.

CRITICAL RULES:
1. Always cite your sources using [1], [2], etc. to reference the context provided
2. If the context doesn't contain enough information, say so clearly and ask clarifying questions
3. Keep answers concise but comprehensive
4. Highlight key takeaways
5. If multiple sources provide different information, mention the discrepancy

Format your response as JSON:
{
  "answer": "Your detailed answer with inline citations [1], [2], etc.",
  "key_points": ["Point 1", "Point 2", ...],
  "citations": [
    {"source_index": 1, "title": "...", "relevance": "why this is relevant"},
    ...
  ],
  "needs_clarification": false,
  "clarifying_questions": []
}`,
          },
          {
            role: "user",
            content: `Context:\n${contextText}\n\nUser Question: ${query}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response:", content);

    // Parse the JSON response
    let answerData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      answerData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response, using raw text");
      answerData = {
        answer: content,
        key_points: [],
        citations: [],
        needs_clarification: false,
        clarifying_questions: [],
      };
    }

    const latency = Date.now() - startTime;

    // Store search history
    if (userId) {
      await supabase.from("search_history").insert({
        user_id: userId,
        query,
        intent: "QUERY",
        result_count: sources.length,
        latency_ms: latency,
      });
    }

    // Map citations to actual sources
    const enrichedCitations = (answerData.citations || []).map((cite: any) => {
      const sourceIndex = cite.source_index - 1;
      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        return {
          ...cite,
          ...sources[sourceIndex],
        };
      }
      return cite;
    });

    return new Response(
      JSON.stringify({
        answer: answerData.answer,
        key_points: answerData.key_points,
        citations: enrichedCitations,
        sources: sources,
        latency_ms: latency,
        needs_clarification: answerData.needs_clarification,
        clarifying_questions: answerData.clarifying_questions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in query-answer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

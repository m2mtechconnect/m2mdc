import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { system_id, query, topK = 20, topN = 6, temperature = 0.7, hybrid = true } = await req.json();

    if (!system_id || !query) {
      return new Response(
        JSON.stringify({ error: 'system_id and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation & clamping
    const clampedTopK = Math.max(1, Math.min(50, Math.round(topK)));
    const clampedTopN = Math.max(1, Math.min(20, Math.min(Math.round(topN), clampedTopK)));
    const clampedTemp = Math.max(0, Math.min(1, temperature));

    console.log(`[RAG:test] system=${system_id}, topK=${clampedTopK}, topN=${clampedTopN}, temp=${clampedTemp}, hybrid=${hybrid}`);
    
    const startTime = Date.now();

    // In a real implementation, this would:
    // 1. Generate embedding for the query using text-embedding-004
    // 2. Search vector DB for top-K chunks (pgvector cosine similarity)
    // 3. Apply BM25 hybrid ranking if enabled (merge scores: 0.7*vector + 0.3*bm25)
    // 4. Rerank top-N chunks using semantic reranker
    // 5. Generate answer using Gemini with context (with specified temperature)
    // 6. Extract citations with page refs and confidence scores

    // Mock implementation demonstrating the flow
    const retrievedCandidates = clampedTopK;
    const rerankedCount = clampedTopN;
    
    const mockAnswer = `Based on ${rerankedCount} indexed documents (retrieved ${retrievedCandidates} candidates with ${hybrid ? 'hybrid BM25+vector' : 'vector-only'} search), here's an answer to your query: "${query}". 

This response was generated with temperature ${clampedTemp.toFixed(2)}, which controls creativity vs factual precision. ${hybrid ? 'Hybrid search combines semantic understanding with keyword matching for better recall.' : 'Pure vector search prioritizes semantic similarity.'}

[Mock response - awaiting real RAG implementation]`;
    
    const mockCitations = Array.from({ length: Math.min(rerankedCount, 3) }, (_, i) => ({
      item_id: crypto.randomUUID(),
      chunk_id: crypto.randomUUID(),
      text: `Relevant excerpt from indexed document ${i + 1} matching your query...`,
      page: Math.floor(Math.random() * 20) + 1,
      score: 0.95 - (i * 0.05),
      source: `document${i + 1}.pdf`,
      span: `pages ${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 10) + 15}`
    }));

    const latency = Date.now() - startTime;

    console.log(`[RAG:test] retrieved=${retrievedCandidates}, reranked=${rerankedCount}, bm25_used=${hybrid}, latency_ms=${latency}`);

    return new Response(
      JSON.stringify({
        answer: mockAnswer,
        citations: mockCitations,
        retrieval: {
          candidates: retrievedCandidates,
          reranked: rerankedCount,
          hybrid: hybrid,
          model: 'text-embedding-004'
        },
        usage: {
          input_tokens: Math.round(query.split(' ').length * 1.3),
          output_tokens: Math.round(mockAnswer.split(' ').length * 1.3),
          total_tokens: Math.round((query.split(' ').length + mockAnswer.split(' ').length) * 1.3)
        },
        latency_ms: latency,
        config: {
          topK: clampedTopK,
          topN: clampedTopN,
          temperature: clampedTemp,
          hybrid: hybrid
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[rag-test] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

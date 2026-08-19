import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { agent_id, input } = await req.json();

    // Validate agent_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!agent_id || !uuidRegex.test(agent_id)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid agent ID. Please select a valid agent from the dropdown.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create agent run record
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        agent_id,
        user_id: user.id,
        input,
        status: 'running'
      })
      .select()
      .single();

    if (runError) throw runError;

    // Stream response using SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Load memory
          const { data: memory } = await supabase
            .from('agent_memory')
            .select('state')
            .eq('agent_id', agent_id)
            .eq('user_id', user.id)
            .single();

          // Search docs for context
          const { data: docsResult } = await supabase.functions.invoke('langgraph-search-docs', {
            body: { query: input.message || input, k: 3 }
          });

          const context = docsResult?.documents?.map((d: any) => d.content).join('\n\n') || '';

          // Call Lovable AI
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          if (!LOVABLE_API_KEY) {
            throw new Error('LOVABLE_API_KEY not configured');
          }

          const messages = [
            {
              role: 'system',
              content: `You are a helpful AI assistant. ${context ? `Use this context:\n${context}` : ''}`
            },
            { role: 'user', content: input.message || input }
          ];

          if (memory?.state?.history) {
            messages.splice(1, 0, ...memory.state.history);
          }

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages,
              stream: true,
            }),
          });

          if (!aiResponse.ok) {
            throw new Error(`AI gateway error: ${aiResponse.status}`);
          }

          const reader = aiResponse.body?.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullResponse += content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: content })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }

          // Update memory
          const newHistory = [
            ...(memory?.state?.history || []).slice(-5),
            { role: 'user', content: input.message || input },
            { role: 'assistant', content: fullResponse }
          ];

          await supabase.functions.invoke('langgraph-upsert-memory', {
            body: {
              agent_id,
              state: { history: newHistory }
            }
          });

          // Update run as completed
          await supabase.functions.invoke('langgraph-log-run', {
            body: {
              runId: run.id,
              status: 'completed',
              output: { response: fullResponse }
            }
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Run error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to run agent'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

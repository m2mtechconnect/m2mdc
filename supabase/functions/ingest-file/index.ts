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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { title, content, fileType } = await req.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ 
        error: 'Title and content are required',
        stage: 'validation'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title,
        content,
        source_type: 'file',
        status: 'processing',
        metadata: { fileType }
      })
      .select()
      .single();

    if (docError) throw docError;

    // Generate summary using Lovable AI
    const summaryResponse = await supabase.functions.invoke('copilot-chat', {
      body: {
        messages: [{
          role: 'user',
          content: `Summarize this document in 2-3 sentences:\n\n${content.substring(0, 4000)}`
        }],
        role: 'engineer',
        useGrounding: false
      }
    });

    const summary = summaryResponse.data?.text || 'Document processed';

    // Update document with summary and mark as indexed
    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({
        summary,
        status: 'indexed',
        vector_indexed: true
      })
      .eq('id', doc.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('File ingest error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to ingest file',
      stage: 'ingest',
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
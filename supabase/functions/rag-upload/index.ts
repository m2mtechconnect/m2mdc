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

    const formData = await req.formData();
    const systemId = formData.get('system_id') as string;
    const residency = (formData.get('residency') as string) || 'ca-northamerica-northeast1';
    const options = JSON.parse((formData.get('options') as string) || '{}');

    if (!systemId) {
      return new Response(JSON.stringify({ error: 'system_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const files = formData.getAll('files') as File[];
    const items = [];

    for (const file of files) {
      // Validate file size (50MB max per file)
      if (file.size > 50 * 1024 * 1024) {
        console.error(`File ${file.name} exceeds 50MB limit`);
        continue;
      }

      // Insert RAG item
      const { data: item, error: insertError } = await supabase
        .from('rag_items')
        .insert({
          system_id: systemId,
          user_id: user.id,
          name: file.name,
          source: 'upload',
          size_bytes: file.size,
          status: 'queued',
          residency: residency,
          options: options
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting RAG item:', insertError);
        continue;
      }

      items.push(item);

      // In a real implementation, we would:
      // 1. Upload file to storage
      // 2. Enqueue parsing job
      // 3. Extract text/tables
      // 4. Chunk content
      // 5. Generate embeddings
      // 6. Store in vector DB

      console.log(`[rag-upload] Queued ${file.name} for processing`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        batch_id: crypto.randomUUID(),
        items 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[rag-upload] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

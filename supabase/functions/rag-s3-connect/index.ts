import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AWS S3 is OPTIONAL - check if configured
    const awsAccessKey = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    
    if (!awsAccessKey || !awsSecretKey) {
      console.warn('[rag-s3-connect] AWS credentials not configured - S3 integration disabled');
      return new Response(JSON.stringify({ 
        error: 'AWS S3 not configured',
        message: 'AWS S3 integration is optional. The app works without it.',
        configured: false
      }), {
        status: 200, // Return 200 since this is optional
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { system_id, bucket, prefix, region } = await req.json();

    if (!system_id || !bucket) {
      return new Response(JSON.stringify({ 
        error: 'system_id and bucket required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Store S3 connection info
    const { error: insertError } = await supabaseClient
      .from('rag_tokens')
      .insert({
        user_id: user.id,
        system_id,
        provider: 's3',
        token_encrypted: new TextEncoder().encode(JSON.stringify({
          bucket,
          prefix: prefix || '',
          region: region || 'us-east-1'
        }))
      });

    if (insertError) {
      console.error('Failed to store S3 config:', insertError);
      throw insertError;
    }

    console.log(`S3 bucket ${bucket} connected for system ${system_id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'S3 bucket connected successfully',
      bucket,
      prefix
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[rag-s3-connect] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to connect S3',
      message: 'AWS S3 integration is optional and can be configured later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

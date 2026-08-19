import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check RBAC - only executives and engineers can test models
    const { data: hasRole } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'executive' 
    });
    
    const { data: hasEngineerRole } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'engineer' 
    });

    if (!hasRole && !hasEngineerRole) {
      return new Response(JSON.stringify({ 
        error: 'Access denied. Executive or Engineer role required.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { modelId, targetRegion = 'northamerica-northeast1' } = await req.json();

    if (!modelId) {
      return new Response(JSON.stringify({ error: 'Model ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();
    let testResult;

    // Test based on model provider
    if (modelId.startsWith('google/')) {
      testResult = await testGoogleModel(modelId, targetRegion);
    } else if (modelId.startsWith('openai/')) {
      testResult = await testOpenAIModel(modelId);
    } else if (modelId.startsWith('anthropic/')) {
      testResult = await testAnthropicModel(modelId);
    } else {
      return new Response(JSON.stringify({ 
        error: 'Unsupported model provider' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const latency = Date.now() - startTime;

    // Log test to integration_logs
    await supabaseClient.from('integration_logs').insert({
      user_id: user.id,
      action: 'model_test',
      status: 'success',
      duration_ms: latency,
      details: {
        model_id: modelId,
        target_region: targetRegion,
        test_result: testResult
      }
    });

    return new Response(JSON.stringify({
      success: true,
      latency,
      result: testResult,
      model: modelId,
      region: targetRegion
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Model test error:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Model test failed',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function testGoogleModel(modelId: string, region: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Respond with just "OK" to confirm connectivity.' }
      ],
      max_tokens: 10
    })
  });

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  if (response.status === 402) {
    throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    response: data.choices?.[0]?.message?.content || 'No response',
    tokens_used: data.usage?.total_tokens || 0
  };
}

async function testOpenAIModel(modelId: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Respond with just "OK" to confirm connectivity.' }
      ],
      max_tokens: 10
    })
  });

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  if (response.status === 402) {
    throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    response: data.choices?.[0]?.message?.content || 'No response',
    tokens_used: data.usage?.total_tokens || 0
  };
}

async function testAnthropicModel(modelId: string): Promise<any> {
  throw new Error('Anthropic models are not yet supported via Lovable AI');
}

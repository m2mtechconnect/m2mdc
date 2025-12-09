import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { system_id, uptime_pct, errors_24h, latency_ms, throughput_rpm, cpu_load_pct, mem_load_pct, event } = body;

    console.log('Ingest health:', { system_id, uptime_pct, latency_ms });

    // Validate system exists
    const { data: system, error: systemError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', system_id)
      .single();

    if (systemError || !system) {
      return new Response(
        JSON.stringify({
          error: 'System not found',
          stage: 'ops/ingest-health',
          requestId: crypto.randomUUID(),
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert health snapshot
    const { error: healthError } = await supabase
      .from('system_health')
      .insert({
        system_id,
        uptime_pct: uptime_pct || 0,
        errors_24h: errors_24h || 0,
        latency_ms: latency_ms || 0,
        throughput_rpm: throughput_rpm || 0,
        cpu_load_pct: cpu_load_pct || null,
        mem_load_pct: mem_load_pct || null,
      });

    if (healthError) throw healthError;

    // Optional: insert event if provided
    if (event) {
      await supabase
        .from('system_events')
        .insert({
          system_id,
          severity: event.severity || 'info',
          message: event.message,
        });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Health data ingested' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ingest health error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'ops/ingest-health',
        requestId: crypto.randomUUID(),
        hint: 'Check payload format',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

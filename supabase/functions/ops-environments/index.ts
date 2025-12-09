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

    console.log('Ops environments request');

    // Get all environments
    const { data: environments, error: envError } = await supabase
      .from('environments')
      .select('id, name')
      .order('name');

    if (envError) throw envError;

    // For each environment, get systems and health
    const envMetrics = await Promise.all(
      (environments || []).map(async (env) => {
        // Get systems in this environment
        const { data: systems } = await supabase
          .from('agents')
          .select('id, last_heartbeat')
          .eq('environment_id', env.id)
          .in('status', ['active', 'deployed', 'running']);

        const systemCount = systems?.length || 0;
        const systemIds = systems?.map(s => s.id) || [];

        if (systemIds.length === 0) {
          return {
            name: env.name,
            systems: 0,
            uptime_pct: 0,
            load_pct: 0,
          };
        }

        // Get latest health for systems in this env
        const { data: healthData } = await supabase
          .from('system_health')
          .select('system_id, uptime_pct, cpu_load_pct, throughput_rpm')
          .in('system_id', systemIds)
          .order('observed_at', { ascending: false });

        // Group by system_id and take latest
        const latestHealthMap = new Map();
        healthData?.forEach(h => {
          if (!latestHealthMap.has(h.system_id)) {
            latestHealthMap.set(h.system_id, h);
          }
        });

        const latestHealth = Array.from(latestHealthMap.values());

        const uptime_pct = latestHealth.length > 0
          ? latestHealth.reduce((sum, h) => sum + (h.uptime_pct || 0), 0) / latestHealth.length
          : 0;

        // Load: avg of cpu_load_pct, or fallback to throughput capacity (1500 rpm = 100%)
        const load_pct = latestHealth.length > 0
          ? latestHealth.reduce((sum, h) => {
              if (h.cpu_load_pct) return sum + h.cpu_load_pct;
              // Fallback: throughput / 1500 rpm capacity
              return sum + Math.min(((h.throughput_rpm || 0) / 1500) * 100, 100);
            }, 0) / latestHealth.length
          : 0;

        return {
          name: env.name,
          systems: systemCount,
          uptime_pct: Math.round(uptime_pct * 10) / 10,
          load_pct: Math.round(load_pct),
        };
      })
    );

    return new Response(
      JSON.stringify({ environments: envMetrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ops environments error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'ops/environments',
        requestId: crypto.randomUUID(),
        hint: 'Try again in 30s',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

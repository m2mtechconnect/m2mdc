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

    const url = new URL(req.url);
    const env = url.searchParams.get('env') || 'all';
    const since = url.searchParams.get('since');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');

    console.log('Ops events request:', { env, since, page, pageSize });

    // Get system IDs for environment filter
    let systemIds: string[] | null = null;
    if (env !== 'all') {
      const { data: envData } = await supabase
        .from('environments')
        .select('id')
        .eq('name', env)
        .maybeSingle();
      
      if (envData) {
        const { data: systems } = await supabase
          .from('agents')
          .select('id')
          .eq('environment_id', envData.id);
        systemIds = systems?.map(s => s.id) || [];
      }
    }

    // Build events query
    let query = supabase
      .from('system_events')
      .select('id, system_id, occurred_at, severity, message, agents(name)', { count: 'exact' })
      .order('occurred_at', { ascending: false });

    if (systemIds !== null && systemIds.length > 0) {
      query = query.in('system_id', systemIds);
    }

    if (since) {
      query = query.gte('occurred_at', since);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: events, error, count } = await query;
    if (error) throw error;

    // Format events with time ago
    const now = new Date();
    const formattedEvents = (events || []).map(e => {
      const occurredAt = new Date(e.occurred_at);
      const minutesAgo = Math.floor((now.getTime() - occurredAt.getTime()) / (1000 * 60));
      
      let timeAgo;
      if (minutesAgo < 1) timeAgo = 'just now';
      else if (minutesAgo < 60) timeAgo = `${minutesAgo} min ago`;
      else if (minutesAgo < 1440) timeAgo = `${Math.floor(minutesAgo / 60)} hour${Math.floor(minutesAgo / 60) > 1 ? 's' : ''} ago`;
      else timeAgo = `${Math.floor(minutesAgo / 1440)} day${Math.floor(minutesAgo / 1440) > 1 ? 's' : ''} ago`;

      return {
        id: e.id,
        system: (e.agents as any)?.name || 'Unknown System',
        time: timeAgo,
        type: e.severity,
        message: e.message,
        occurred_at: e.occurred_at,
      };
    });

    return new Response(
      JSON.stringify({
        events: formattedEvents,
        total: count || 0,
        page,
        pageSize,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ops events error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'ops/events',
        requestId: crypto.randomUUID(),
        hint: 'Try again in 30s',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

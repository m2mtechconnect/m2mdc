// Funding Programs Query API Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const jurisdiction = url.searchParams.get('jurisdiction');
    const province = url.searchParams.get('province');
    const focus = url.searchParams.get('focus');
    const status = url.searchParams.get('status') || 'Open';
    const fundingType = url.searchParams.get('funding_type');
    const minAmount = url.searchParams.get('min_amount');
    const maxAmount = url.searchParams.get('max_amount');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    console.log('[Funding Query] Query parameters:', {
      jurisdiction,
      province,
      focus,
      status,
      fundingType,
      minAmount,
      maxAmount,
      limit,
    });

    // Build query
    let query = supabase
      .from('funding_programs')
      .select('*')
      .order('last_updated', { ascending: false });

    // Apply filters
    if (jurisdiction) {
      query = query.eq('jurisdiction', jurisdiction);
    }

    if (province) {
      query = query.eq('province', province);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (focus) {
      // Search in focus_areas array
      query = query.contains('focus_areas', [focus]);
    }

    if (fundingType) {
      // Search in funding_type array
      query = query.contains('funding_type', [fundingType]);
    }

    if (minAmount) {
      query = query.gte('funding_amount_min', parseInt(minAmount));
    }

    if (maxAmount) {
      query = query.lte('funding_amount_max', parseInt(maxAmount));
    }

    query = query.limit(limit);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('[Funding Query] Database error:', error);
      throw error;
    }

    console.log(`[Funding Query] Found ${data?.length || 0} programs`);

    return new Response(
      JSON.stringify({
        success: true,
        count: data?.length || 0,
        programs: data || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Funding Query] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

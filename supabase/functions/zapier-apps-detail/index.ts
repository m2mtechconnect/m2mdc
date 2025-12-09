import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const appId = pathParts[pathParts.length - 1];

    if (!appId) {
      throw new Error('App ID is required');
    }

    // Fetch from cache first
    const { data: app, error: dbError } = await supabase
      .from('zapier_apps')
      .select('*')
      .eq('id', appId)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      throw dbError;
    }

    // If not in cache or cache is old, try fetching from Zapier API
    const zapierBaseUrl = Deno.env.get('ZAPIER_BASE_URL') || 'https://api.zapier.com';
    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');

    let appDetail = app;

    if (zapierClientId && (!app || !app.last_synced_at || 
        new Date(app.last_synced_at) < new Date(Date.now() - 24 * 60 * 60 * 1000))) {
      try {
        console.log('Fetching app detail from Zapier API:', appId);
        const response = await fetch(`${zapierBaseUrl}/v1/apps/${appId}`, {
          headers: {
            'Accept': 'application/json',
            'Client-Id': zapierClientId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          appDetail = {
            id: data.key || data.id,
            name: data.title || data.name,
            description: data.description || '',
            logo_url: data.image_url || data.logo,
            category: data.categories?.[0] || 'Other',
            status: data.api_status === 'live' ? 'Active' : 'Beta',
            premium: data.premium || false,
            pricing_tier: data.premium ? 'Premium' : 'Free',
            users_count: data.users_count || 0,
            supports_triggers: data.has_triggers || true,
            supports_actions: data.has_actions || true,
            auth_type: data.authentication_type || 'oauth2',
            last_synced_at: new Date().toISOString(),
          };

          // Update cache
          await supabase.from('zapier_apps').upsert(appDetail, { onConflict: 'id' });
        }
      } catch (apiError) {
        console.warn('Failed to fetch from Zapier API:', apiError);
      }
    }

    if (!appDetail) {
      throw new Error('App not found');
    }

    // Check if user has connected this app
    const { data: connection } = await supabase
      .from('integrations_tokens')
      .select('id, status, last_sync_at, metadata')
      .eq('user_id', user.id)
      .eq('app_id', appId)
      .eq('status', 'active')
      .single();

    return new Response(
      JSON.stringify({
        ...appDetail,
        is_connected: !!connection,
        connection_info: connection ? {
          status: connection.status,
          last_sync: connection.last_sync_at,
          metadata: connection.metadata,
        } : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get app detail error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZapierConnectionRequest {
  action: 'connect' | 'disconnect' | 'status' | 'callback';
  provider: string;
  systemId?: string;
  code?: string;
  state?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: ZapierConnectionRequest = await req.json();
    console.log('Zapier request:', body);

    switch (body.action) {
      case 'connect': {
        // Generate OAuth URL for Zapier
        const state = crypto.randomUUID();
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/integrations-zapier`;
        
        // Store state for verification
        await supabase.from('integrations').upsert({
          user_id: user.id,
          provider: body.provider,
          status: 'pending',
          state,
          connect_method: 'zapier',
          category: 'Business Tools',
        });

        // Return Zapier OAuth URL (simplified for webhook-based approach)
        return new Response(JSON.stringify({
          success: true,
          message: 'Create a Zap with "Webhooks by Zapier" as the trigger',
          instructions: [
            '1. Go to zapier.com/app/editor',
            '2. Create a new Zap',
            '3. Set trigger to "Webhooks by Zapier" → "Catch Hook"',
            '4. Copy the webhook URL Zapier provides',
            '5. Save your Zap and use it in workflows'
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'callback': {
        // Handle OAuth callback
        const { code, state } = body;
        if (!code || !state) {
          throw new Error('Missing OAuth parameters');
        }

        // Verify state
        const { data: integration } = await supabase
          .from('integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('state', state)
          .single();

        if (!integration) {
          throw new Error('Invalid state parameter');
        }

        // Update integration status
        await supabase
          .from('integrations')
          .update({
            status: 'connected',
            last_sync: new Date().toISOString(),
            state: null,
          })
          .eq('id', integration.id);

        return new Response(JSON.stringify({
          success: true,
          integration: {
            id: integration.id,
            provider: integration.provider,
            status: 'connected',
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'status': {
        // Get connection status
        const { data: integrations } = await supabase
          .from('integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', body.provider);

        const integration = integrations?.[0];
        
        return new Response(JSON.stringify({
          connected: integration?.status === 'connected',
          provider: body.provider,
          lastSync: integration?.last_sync,
          status: integration?.status || 'not-connected',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'disconnect': {
        // Disconnect integration
        const { error } = await supabase
          .from('integrations')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', body.provider);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          message: 'Integration disconnected'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Zapier error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process Zapier request' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

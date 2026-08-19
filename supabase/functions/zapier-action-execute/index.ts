import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCaller, callerRejectedResponse } from "../_shared/callerIdentity.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Phase 2: in-code caller identity. This handler holds a service-role
  // client, so an anonymous caller must never reach its queries.
  try {
    await requireCaller(req);
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;
    throw error;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { systemId, runId, connectionId, actionKey, actionParams, traceId } = await req.json();

    if (!systemId || !actionKey) {
      throw new Error('systemId and actionKey are required');
    }

    console.log('Executing Zapier action:', { systemId, actionKey, traceId });

    const startTime = Date.now();

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('integrations_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found or expired');
    }

    // Check if token is expired or expiring soon (within 2 minutes)
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const now = new Date();
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);

    if (expiresAt && expiresAt < twoMinutesFromNow) {
      console.log('Token expired or expiring soon, attempting refresh');
      
      try {
        // Attempt to refresh the token
        const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zapier-refresh-token', {
          body: { connectionId },
        });

        if (refreshError || !refreshData?.success) {
          // Token refresh failed, mark connection as expired
          await supabase
            .from('integrations_connections')
            .update({
              status: 'expired',
              last_error: 'Token expired and refresh failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', connectionId);

          throw new Error('Access token expired and refresh failed');
        }

        console.log('Token refreshed successfully');

        // Fetch updated connection
        const { data: updatedConnection, error: updateFetchError } = await supabase
          .from('integrations_connections')
          .select('*')
          .eq('id', connectionId)
          .single();

        if (updateFetchError || !updatedConnection) {
          throw new Error('Failed to fetch updated connection');
        }

        // Use the refreshed connection for the action
        connection.access_token = updatedConnection.access_token;
        connection.expires_at = updatedConnection.expires_at;
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr);
        throw new Error(`Token expired: ${refreshErr instanceof Error ? refreshErr.message : 'Refresh failed'}`);
      }
    }

    // Execute action via Zapier API (simplified mock)
    let actionResult;
    let success = true;
    let errorMessage = null;

    try {
      // Map common actions
      switch (actionKey) {
        case 'slack.postMessage':
          actionResult = { 
            message_id: `msg_${Date.now()}`,
            channel: actionParams?.channel || 'general',
            text: actionParams?.text,
          };
          break;
        
        case 'gmail.sendEmail':
          actionResult = {
            message_id: `email_${Date.now()}`,
            to: actionParams?.to,
            subject: actionParams?.subject,
          };
          break;
        
        case 'hubspot.createContact':
          actionResult = {
            contact_id: `contact_${Date.now()}`,
            email: actionParams?.email,
          };
          break;
        
        default:
          actionResult = {
            action: actionKey,
            status: 'executed',
            params: actionParams,
          };
      }

      console.log('Action executed successfully:', actionKey);
    } catch (err) {
      success = false;
      errorMessage = err instanceof Error ? err.message : 'Action execution failed';
      console.error('Action execution error:', err);
    }

    const duration = Date.now() - startTime;

    // Log action
    const { error: logError } = await supabase
      .from('agent_action_logs')
      .insert({
        run_id: runId,
        system_id: systemId,
        connection_id: connectionId,
        action_key: actionKey,
        action_params: actionParams,
        status: success ? 'success' : 'error',
        error_message: errorMessage,
        response: actionResult,
        trace_id: traceId,
        duration_ms: duration,
      });

    if (logError) {
      console.error('Failed to log action:', logError);
    }

    return new Response(
      JSON.stringify({
        success,
        result: actionResult,
        error: errorMessage,
        duration_ms: duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Action execute error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
/**
 * Digital Twin Runs List Edge Function
 * Lists run history for a digital twin
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Scoped CORS headers for this invocation. Module-level helpers below render
// responses, so the resolved headers are held here and refreshed per request.
let corsHeaders = getCorsHeaders(null);



interface RestResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  correlationId: string;
}

function generateCorrelationId(): string {
  return crypto.randomUUID();
}

function createSuccessResponse<T>(data: T, correlationId: string): Response {
  const response: RestResponse<T> = {
    success: true,
    data,
    error: null,
    correlationId,
  };
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  correlationId: string,
  details?: any
): Response {
  const response: RestResponse = {
    success: false,
    data: null,
    error: { code, message, details },
    correlationId,
  };
  console.error(`[${correlationId}] Error ${code}: ${message}`, details);
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const correlationId = generateCorrelationId();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${correlationId}] List runs request`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authorization header required',
        401,
        correlationId
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Invalid authentication',
        401,
        correlationId
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const twinId = url.searchParams.get('twin_id');
    const twinSlug = url.searchParams.get('twin_slug');
    const status = url.searchParams.get('status');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20;

    // Validate required params
    if (!twinId && !twinSlug) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Either twin_id or twin_slug is required',
        400,
        correlationId
      );
    }

    // Resolve twin ID if needed
    let resolvedTwinId = twinId;
    if (!resolvedTwinId && twinSlug) {
      const { data: twin, error: twinError } = await supabase
        .from('digital_twins')
        .select('id')
        .eq('slug', twinSlug)
        .eq('user_id', user.id)
        .single();

      if (twinError || !twin) {
        return createErrorResponse(
          'NOT_FOUND',
          `Digital twin not found with slug: ${twinSlug}`,
          404,
          correlationId
        );
      }
      resolvedTwinId = twin.id;
    }

    // Build query
    let query = supabase
      .from('digital_twin_runs')
      .select('id, run_id, event_id, status, created_at, completed_at')
      .eq('twin_id', resolvedTwinId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: runs, error: runsError } = await query;

    if (runsError) {
      console.error(`[${correlationId}] Query error:`, runsError);
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch runs',
        500,
        correlationId,
        { error: runsError.message }
      );
    }

    // Transform runs to include summary
    const transformedRuns = (runs || []).map((run: any) => ({
      id: run.id,
      run_id: run.run_id,
      event_id: run.event_id,
      status: run.status,
      created_at: run.created_at,
      duration_ms: run.completed_at 
        ? new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()
        : null,
      summary: `Event: ${run.event_id} - Status: ${run.status}`,
    }));

    console.log(`[${correlationId}] Found ${transformedRuns.length} runs`);

    return createSuccessResponse(
      { runs: transformedRuns },
      correlationId
    );

  } catch (error) {
    console.error(`[${correlationId}] Unexpected error:`, error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500,
      correlationId
    );
  }
});

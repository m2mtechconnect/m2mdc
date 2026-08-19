/**
 * Digital Twin Run Get Edge Function
 * Retrieves detailed information about a specific run
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


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
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const correlationId = generateCorrelationId();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${correlationId}] Get run details request`);

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
    const id = url.searchParams.get('id');
    const runId = url.searchParams.get('run_id');

    if (!id && !runId) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Either id or run_id is required',
        400,
        correlationId
      );
    }

    // Build query
    let query = supabase
      .from('digital_twin_runs')
      .select(`
        id,
        twin_id,
        event_id,
        run_id,
        status,
        logs,
        state_changes,
        created_at,
        completed_at,
        digital_twins!inner(id, name, slug)
      `)
      .eq('user_id', user.id);

    if (id) {
      query = query.eq('id', id);
    } else if (runId) {
      query = query.eq('run_id', runId);
    }

    const { data: runs, error: runError } = await query;

    if (runError) {
      console.error(`[${correlationId}] Query error:`, runError);
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch run',
        500,
        correlationId,
        { error: runError.message }
      );
    }

    if (!runs || runs.length === 0) {
      return createErrorResponse(
        'NOT_FOUND',
        `Run not found with ${id ? 'id' : 'run_id'}: ${id || runId}`,
        404,
        correlationId
      );
    }

    const run = runs[0];
    const twin = Array.isArray(run.digital_twins) ? run.digital_twins[0] : run.digital_twins;

    const result = {
      id: run.id,
      twin_id: run.twin_id,
      event_id: run.event_id,
      run_id: run.run_id,
      status: run.status,
      logs: run.logs || [],
      state_changes: run.state_changes || [],
      created_at: run.created_at,
      completed_at: run.completed_at,
      twin: {
        id: twin?.id,
        name: twin?.name,
        slug: twin?.slug,
      },
    };

    console.log(`[${correlationId}] Retrieved run: ${run.run_id}`);

    return createSuccessResponse(
      { run: result },
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

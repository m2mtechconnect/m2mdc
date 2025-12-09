/**
 * Digital Twin Event Trigger Edge Function
 * Executes a digital twin workflow for a given event
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request validation schema
const triggerEventSchema = z.object({
  twin_id: z.string().uuid().optional(),
  twin_slug: z.string().min(1).optional(),
  event_id: z.string().min(1),
  payload: z.record(z.unknown()),
}).refine(
  (data) => data.twin_id || data.twin_slug,
  { message: "Either twin_id or twin_slug must be provided" }
);

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
  const correlationId = generateCorrelationId();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${correlationId}] Digital Twin event trigger request`);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authorization header required',
        401,
        correlationId
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Invalid authentication',
        401,
        correlationId
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = triggerEventSchema.safeParse(body);
    
    if (!validation.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        correlationId,
        validation.error.errors
      );
    }

    const { twin_id, twin_slug, event_id, payload } = validation.data;

    // Resolve twin ID
    let twinId = twin_id;
    if (!twinId && twin_slug) {
      const { data: twin, error: twinError } = await supabase
        .from('digital_twins')
        .select('id')
        .eq('slug', twin_slug)
        .eq('user_id', user.id)
        .single();

      if (twinError || !twin) {
        return createErrorResponse(
          'NOT_FOUND',
          `Digital twin not found with slug: ${twin_slug}`,
          404,
          correlationId
        );
      }
      twinId = twin.id;
    }

    // Load twin configuration
    const { data: twinData, error: loadError } = await supabase
      .from('digital_twins')
      .select('*')
      .eq('id', twinId)
      .eq('user_id', user.id)
      .single();

    if (loadError || !twinData) {
      return createErrorResponse(
        'NOT_FOUND',
        `Digital twin not found with ID: ${twinId}`,
        404,
        correlationId
      );
    }

    const config = twinData.config as any;

    // Validate event exists in config
    const eventExists = config.events?.some((e: any) => e.id === event_id);
    if (!eventExists) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `Event '${event_id}' not found in twin configuration`,
        400,
        correlationId
      );
    }

    console.log(`[${correlationId}] Triggering twin event: ${event_id} for twin: ${twinId}`);

    // Execute runtime via edge function
    const { data: runtimeResult, error: runtimeError } = await supabase.functions.invoke(
      'digital-twin-runtime',
      {
        body: {
          twinId,
          eventId: event_id,
          payload,
        },
      }
    );

    if (runtimeError) {
      console.error(`[${correlationId}] Runtime error:`, runtimeError);
      return createErrorResponse(
        'RUNTIME_ERROR',
        'Failed to execute digital twin runtime',
        500,
        correlationId,
        { error: runtimeError.message }
      );
    }

    console.log(`[${correlationId}] Runtime completed successfully`);

    return createSuccessResponse(
      { run: runtimeResult },
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

import { getCorsHeaders } from './cors.ts';

/**
 * Fail-closed compatibility tombstone for a provider-specific endpoint that
 * has been removed from the supported AURA runtime. Keeping a 410 handler for
 * one release cycle prevents an already-deployed legacy Edge Function from
 * continuing to access credentials or mutate state while runtime undeployment
 * is verified separately.
 */
export function retiredEndpoint(req: Request): Response {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error: 'ENDPOINT_RETIRED',
      message: 'This legacy integration endpoint is not part of the supported AURA runtime.',
    }),
    {
      status: 410,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}

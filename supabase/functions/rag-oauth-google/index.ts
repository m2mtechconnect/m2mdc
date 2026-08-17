/**
 * QUARANTINED - AURA_IMPLEMENTATION_AUDIT_P1_SECURITY_CLOSURE
 *
 * This function previously performed an independent Google OAuth authorization
 * code exchange and persisted raw access/refresh tokens into `public.rag_tokens`.
 * That is a parallel OAuth implementation and conflicts with the approved
 * managed App User Connector architecture.
 *
 * Status: PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR
 *
 * The handler is fail-closed: it never builds an authorization URL, never
 * exchanges an authorization code, and never writes a token. Do not restore the
 * previous implementation. Google user authorization must migrate to the
 * managed App User Connector path, which stores only an opaque gateway handle.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.warn('rag-oauth-google invoked while quarantined; refusing fail-closed.');

  return new Response(
    JSON.stringify({
      error: 'disabled',
      status: 'PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR',
      message:
        'This authorization path is permanently disabled. Google authorization must use the managed connector path, which stores no provider tokens in AURA.',
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

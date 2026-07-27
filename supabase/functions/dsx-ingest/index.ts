// Phase 2.b bootstrap — verifies the function-local deno.json resolves
// the canonical DSX contract via the _shared relocation. The full handler
// body follows after the relocation gate passes.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import {
  parseDsxEvent,
  SUPPORTED_DSX_SCHEMA_VERSIONS,
} from '../_shared/dsx-contract.ts';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      ok: true,
      supported_schema_versions: SUPPORTED_DSX_SCHEMA_VERSIONS,
      contract_ready: typeof parseDsxEvent === 'function',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

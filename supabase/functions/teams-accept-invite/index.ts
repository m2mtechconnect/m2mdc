import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Kept in sync with the org membership role constraint. Owner is accepted here
// only because the platform provisioner issues the first customer-owner invite;
// ordinary teams-invite calls never mint owner.
const INVITABLE_ROLES = new Set([
  'owner',
  'admin',
  'viewer',
  'operator',
  'engineer',
  'manager',
  'executive',
  'security_admin',
  'compliance',
  'data_analyst',
  'support',
]);

let corsHeaders = getCorsHeaders(null);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized', stage: 'authentication' }, 401);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) return json({ error: 'An invite token is required', stage: 'validation' }, 400);

    const { data: acceptedInvites, error: acceptError } = await authClient.rpc('accept_org_invite_token', {
      _token: token,
    });
    if (acceptError) throw acceptError;
    const accepted = Array.isArray(acceptedInvites) ? acceptedInvites[0] : acceptedInvites;
    if (!accepted?.organization_id || !INVITABLE_ROLES.has(String(accepted.invited_role))) {
      throw new Error('Invitation acceptance returned an incomplete result');
    }

    return json({
      success: true,
      role: accepted.invited_role,
      organizationId: accepted.organization_id,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    console.error('Team invite acceptance error:', error);
    const diagnosticCode = error && typeof error === 'object' && 'code' in error
      && typeof error.code === 'string'
      ? error.code
      : null;
    const diagnosticMessage = error && typeof error === 'object' && 'message' in error
      && typeof error.message === 'string'
      ? error.message
      : null;
    return json({
      error: diagnosticMessage ?? (error instanceof Error ? error.message : 'Failed to accept invite'),
      stage: 'accept',
      diagnosticCode,
      requestId: crypto.randomUUID(),
    }, 500);
  }
});

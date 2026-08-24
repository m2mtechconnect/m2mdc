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

    // The recipient is authenticated before the privileged client is created.
    // The service client is then used only to resolve the opaque invite token
    // and execute the service-role-only transactional acceptance RPC.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: invite, error: inviteError } = await serviceClient
      .from('team_invites')
      .select('id, email, role, status, invited_by, org_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) return json({ error: 'This invite is not valid', stage: 'lookup' }, 404);

    if (invite.status !== 'pending') {
      return json({ error: `This invite has already been ${invite.status}`, stage: 'state' }, 409);
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await serviceClient.from('team_invites').update({ status: 'expired' }).eq('id', invite.id);
      return json({ error: 'This invite has expired', stage: 'state' }, 410);
    }

    if (!invite.org_id) {
      return json({ error: 'This legacy invite is not organization-bound', stage: 'organization' }, 409);
    }

    const claimEmail = String(user.email ?? '').trim().toLowerCase();
    if (!claimEmail || claimEmail !== String(invite.email).trim().toLowerCase()) {
      return json({ error: 'This invite was issued to a different account', stage: 'authorization' }, 403);
    }

    if (!INVITABLE_ROLES.has(String(invite.role))) {
      return json({ error: 'That role cannot be granted through an invite', stage: 'authorization' }, 403);
    }

    const { data: orgId, error: acceptError } = await serviceClient.rpc('accept_org_invite', {
      _invite_id: invite.id,
      _user_id: user.id,
    });

    if (acceptError) throw acceptError;

    return json({
      success: true,
      role: invite.role,
      organizationId: orgId,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    console.error('Team invite acceptance error:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to accept invite',
      stage: 'accept',
      requestId: crypto.randomUUID(),
    }, 500);
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// An invite may only ever confer a non-privileged role. Kept in sync with
// teams-invite so a stale row can never escalate on acceptance.
const INVITABLE_ROLES = new Set([
  'viewer',
  'operator',
  'engineer',
  'manager',
  'executive',
  'compliance',
  'data_analyst',
  'support',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
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

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized', stage: 'authentication' }, 401);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) return json({ error: 'An invite token is required', stage: 'validation' }, 400);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: invite, error: inviteError } = await serviceClient
      .from('team_invites')
      .select('id, email, role, status, invited_by, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) throw inviteError;
    // Do not distinguish "no such token" from "not yours": both are just invalid.
    if (!invite) return json({ error: 'This invite is not valid', stage: 'lookup' }, 404);

    if (invite.status !== 'pending') {
      return json({ error: `This invite has already been ${invite.status}`, stage: 'state' }, 409);
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await serviceClient.from('team_invites').update({ status: 'expired' }).eq('id', invite.id);
      return json({ error: 'This invite has expired', stage: 'state' }, 410);
    }

    // Recipient identity comes from the signed JWT claim, never from a
    // client-supplied or user-editable email mirror.
    const claimEmail = String(user.email ?? '').trim().toLowerCase();
    if (!claimEmail || claimEmail !== String(invite.email).trim().toLowerCase()) {
      return json({ error: 'This invite was issued to a different account', stage: 'authorization' }, 403);
    }

    if (!INVITABLE_ROLES.has(String(invite.role))) {
      return json({ error: 'That role cannot be granted through an invite', stage: 'authorization' }, 403);
    }

    const { error: grantError } = await serviceClient
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          role: invite.role,
          scope: 'global',
          granted_by: invite.invited_by,
          granted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role,scope' },
      );

    if (grantError) throw grantError;

    const { error: consumeError } = await serviceClient
      .from('team_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)
      .eq('status', 'pending');

    if (consumeError) throw consumeError;

    return json({ success: true, role: invite.role, redirectTo: '/teams' });
  } catch (error) {
    console.error('Team invite acceptance error:', error);
    return json({
      error: error instanceof Error ? error.message : 'Failed to accept invite',
      stage: 'accept',
      requestId: crypto.randomUUID(),
    }, 500);
  }
});

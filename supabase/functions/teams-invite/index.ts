import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Customer admins may delegate operational/admin membership inside their own
// organization, but ordinary invitations never mint the owner role.
const INVITABLE_ROLES = new Set([
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

const INVITER_ROLES = new Set(['admin', 'owner']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (corsHeaders: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
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
    if (authError || !user) {
      return json(corsHeaders, { error: 'Unauthorized', stage: 'authentication' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email : '';
    const role = typeof body?.role === 'string' ? body.role : '';

    if (!email || !role) {
      return json(corsHeaders, { error: 'Email and role are required', stage: 'validation' }, 400);
    }

    const normalisedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalisedEmail)) {
      return json(corsHeaders, { error: 'A valid email address is required', stage: 'validation' }, 400);
    }

    if (!INVITABLE_ROLES.has(role)) {
      return json(corsHeaders, { error: 'That role cannot be granted through an invite', stage: 'validation' }, 400);
    }

    // Fail closed before constructing a service-role client. The caller must
    // have an approved profile and an active organization selected.
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('is_approved, last_active_org_id, org_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.is_approved) {
      return json(corsHeaders, { error: 'Approved account required', stage: 'authorization' }, 403);
    }

    const orgId = profile.last_active_org_id ?? profile.org_id;
    if (!orgId) {
      return json(corsHeaders, { error: 'Select an organization before inviting members', stage: 'organization' }, 409);
    }

    const { data: membership, error: membershipError } = await authClient
      .from('org_memberships')
      .select('role, status')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership || membership.status !== 'active' || !INVITER_ROLES.has(String(membership.role))) {
      return json(corsHeaders, {
        error: 'You need the organization admin or owner role to invite team members',
        stage: 'authorization',
      }, 403);
    }

    // Only the organization owner may create another organization admin.
    if (role === 'admin' && membership.role !== 'owner') {
      return json(corsHeaders, {
        error: 'Only the organization owner can invite another administrator',
        stage: 'authorization',
      }, 403);
    }

    // Service role is created only after identity, approval, tenant and role
    // authorization have all succeeded.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: existingInvites, error: existingError } = await serviceClient
      .from('team_invites')
      .select('id, expires_at')
      .eq('org_id', orgId)
      .eq('email', normalisedEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (existingError) throw existingError;
    if (existingInvites && existingInvites.length > 0) {
      return json(corsHeaders, {
        error: 'An active invitation already exists for this email in the organization',
        stage: 'state',
      }, 409);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await serviceClient
      .from('team_invites')
      .insert({
        email: normalisedEmail,
        role,
        invited_by: user.id,
        org_id: orgId,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('id, email, role, status, invited_by, org_id, expires_at, created_at')
      .single();

    if (error) throw error;

    return json(corsHeaders, {
      success: true,
      invite: data,
      message: `Invitation created for ${normalisedEmail}`,
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return json(corsHeaders, {
      error: error instanceof Error ? error.message : 'Failed to create invitation',
      stage: 'invite',
      requestId: crypto.randomUUID(),
    }, 500);
  }
});
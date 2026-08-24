import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { callerRejectedResponse, requireCaller } from "../_shared/callerIdentity.ts";
import { sendOrganizationInviteNotification } from "../_shared/notifications.ts";
import { enqueueAuraWorkflow } from "../_shared/workflows.ts";

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

const INVITER_ROLES = new Set(['admin', 'owner', 'security_admin']);
const ELEVATED_INVITE_ROLES = new Set(['admin', 'security_admin']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestMode = 'tenant_invite' | 'platform_provision' | 'platform_resend_owner';

const json = (corsHeaders: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function normalizedMode(body: Record<string, unknown>): RequestMode {
  if (body.mode === 'platform_provision') return 'platform_provision';
  if (body.mode === 'platform_resend_owner') return 'platform_resend_owner';
  return 'tenant_invite';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const caller = await requireCaller(req);
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${caller.token}` } } },
    );

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const mode = normalizedMode(body);

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('is_approved')
      .eq('user_id', caller.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.is_approved) {
      return json(corsHeaders, { error: 'Approved account required', stage: 'authorization' }, 403);
    }

    if (mode === 'platform_provision' || mode === 'platform_resend_owner') {
      const { data: isPlatformOwner, error: roleError } = await authClient.rpc('user_has_role', {
        check_user_id: caller.userId,
        check_role: 'owner',
        check_scope: 'global',
      });
      if (roleError) throw roleError;
      if (isPlatformOwner !== true) {
        return json(corsHeaders, { error: 'Platform owner role required', stage: 'authorization' }, 403);
      }

      // Privileged client is created only after authentication, approval and
      // the live global platform-owner check all succeed.
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      if (mode === 'platform_provision') {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const domain = typeof body.domain === 'string' ? body.domain.trim().toLowerCase() : '';
        const industry = typeof body.industry === 'string' ? body.industry.trim() : '';
        const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim().toLowerCase() : '';

        if (!name) return json(corsHeaders, { error: 'Organization name is required', stage: 'validation' }, 400);
        if (!EMAIL_PATTERN.test(ownerEmail)) {
          return json(corsHeaders, { error: 'A valid owner email is required', stage: 'validation' }, 400);
        }

        if (domain) {
          const { data: existing, error: existingError } = await serviceClient
            .from('organizations')
            .select('id')
            .eq('domain', domain)
            .limit(1);
          if (existingError) throw existingError;
          if (existing && existing.length > 0) {
            return json(corsHeaders, { error: 'An organization already uses this domain', stage: 'state' }, 409);
          }
        }

        const { data, error } = await serviceClient.rpc('platform_provision_organization', {
          _name: name,
          _domain: domain || null,
          _industry: industry || null,
          _owner_email: ownerEmail,
          _invited_by: caller.userId,
        });
        if (error) throw error;

        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.org_id || !result?.invite_id || !result?.invite_token) {
          throw new Error('Organization provisioning did not return a complete result');
        }

        const notification = await sendOrganizationInviteNotification({
          email: ownerEmail,
          organizationName: name,
          role: 'owner',
          token: result.invite_token,
          expiresAt: result.invite_expires_at,
          inviteId: result.invite_id,
        });

        const workflow = await enqueueAuraWorkflow({
          name: 'aura/onboarding.organization.provisioned',
          organizationId: result.org_id,
          data: {
            invite_id: result.invite_id,
            deployment_type: 'shared_cloud',
            notification_status: notification.status,
          },
        });

        return json(corsHeaders, {
          success: true,
          organization: {
            id: result.org_id,
            name,
            domain: domain || null,
            industry: industry || null,
          },
          ownerInvite: {
            id: result.invite_id,
            email: ownerEmail,
            role: 'owner',
            expiresAt: result.invite_expires_at,
            delivery: notification,
          },
          workflow,
          status: 'pending_owner_acceptance',
        }, 201);
      }

      const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
      if (!orgId) return json(corsHeaders, { error: 'Organization id is required', stage: 'validation' }, 400);

      const [{ data: organization, error: organizationError }, { data: activeOwners, error: ownerError }] = await Promise.all([
        serviceClient.from('organizations').select('id, name').eq('id', orgId).maybeSingle(),
        serviceClient.from('org_memberships').select('user_id').eq('org_id', orgId).eq('role', 'owner').eq('status', 'active').limit(1),
      ]);
      if (organizationError) throw organizationError;
      if (ownerError) throw ownerError;
      if (!organization) return json(corsHeaders, { error: 'Organization not found', stage: 'lookup' }, 404);
      if (activeOwners && activeOwners.length > 0) {
        return json(corsHeaders, { error: 'Organization already has an active owner', stage: 'state' }, 409);
      }

      const { data: existingInvite, error: inviteLookupError } = await serviceClient
        .from('team_invites')
        .select('id, email')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inviteLookupError) throw inviteLookupError;
      if (!existingInvite?.id || !EMAIL_PATTERN.test(String(existingInvite.email ?? '').trim().toLowerCase())) {
        return json(corsHeaders, { error: 'Owner invitation record not found', stage: 'lookup' }, 404);
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const ownerEmail = String(existingInvite.email).trim().toLowerCase();
      const { error: updateError } = await serviceClient
        .from('team_invites')
        .update({ token, status: 'pending', expires_at: expiresAt })
        .eq('id', existingInvite.id);
      if (updateError) throw updateError;

      const notification = await sendOrganizationInviteNotification({
        email: ownerEmail,
        organizationName: organization.name,
        role: 'owner',
        token,
        expiresAt,
        inviteId: existingInvite.id,
      });

      return json(corsHeaders, {
        success: true,
        ownerInvite: {
          id: existingInvite.id,
          email: ownerEmail,
          expiresAt,
          delivery: notification,
        },
        status: 'pending_owner_acceptance',
      });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = typeof body.role === 'string' ? body.role.trim() : '';
    if (!EMAIL_PATTERN.test(email)) {
      return json(corsHeaders, { error: 'A valid email address is required', stage: 'validation' }, 400);
    }
    if (!INVITABLE_ROLES.has(role)) {
      return json(corsHeaders, { error: 'That role cannot be granted through an invite', stage: 'validation' }, 400);
    }

    const { data: activeOrgId, error: activeOrgError } = await authClient.rpc('active_org_id');
    if (activeOrgError) throw activeOrgError;
    const orgId = typeof activeOrgId === 'string' ? activeOrgId : '';
    if (!orgId) {
      return json(corsHeaders, { error: 'Select an organization before inviting members', stage: 'organization' }, 409);
    }

    const { data: membership, error: membershipError } = await authClient
      .from('org_memberships')
      .select('role, status')
      .eq('org_id', orgId)
      .eq('user_id', caller.userId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership || membership.status !== 'active' || !INVITER_ROLES.has(String(membership.role))) {
      return json(corsHeaders, {
        error: 'You need organization member-management permission to invite team members',
        stage: 'authorization',
      }, 403);
    }
    if (ELEVATED_INVITE_ROLES.has(role) && membership.role !== 'owner') {
      return json(corsHeaders, {
        error: 'Only the organization owner can invite elevated administrators',
        stage: 'authorization',
      }, 403);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const [{ data: existingMembership, error: existingMembershipError }, { data: existingInvites, error: existingError }] = await Promise.all([
      serviceClient.from('org_memberships').select('status').eq('org_id', orgId).eq('user_id', caller.userId).maybeSingle(),
      serviceClient
        .from('team_invites')
        .select('id, expires_at')
        .eq('org_id', orgId)
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .limit(1),
    ]);
    if (existingMembershipError) throw existingMembershipError;
    if (!existingMembership || existingMembership.status !== 'active') {
      return json(corsHeaders, { error: 'Active organization membership required', stage: 'authorization' }, 403);
    }
    if (existingError) throw existingError;
    if (existingInvites && existingInvites.length > 0) {
      return json(corsHeaders, {
        error: 'An active invitation already exists for this email in the organization',
        stage: 'state',
      }, 409);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await serviceClient
      .from('team_invites')
      .insert({
        email,
        role,
        invited_by: caller.userId,
        org_id: orgId,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('id, email, role, status, invited_by, org_id, expires_at, created_at')
      .single();
    if (error) throw error;

    const { data: organization } = await serviceClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();
    const organizationName = typeof organization?.name === 'string' && organization.name.trim()
      ? organization.name.trim()
      : 'your organization';

    const notification = await sendOrganizationInviteNotification({
      email,
      organizationName,
      role,
      token,
      expiresAt: expiresAt.toISOString(),
      inviteId: data.id,
    });

    const workflow = await enqueueAuraWorkflow({
      name: 'aura/onboarding.invite.created',
      organizationId: orgId,
      data: {
        invite_id: data.id,
        role,
        notification_status: notification.status,
      },
    });

    return json(corsHeaders, {
      success: true,
      invite: data,
      delivery: notification,
      workflow,
      message: `Invitation created for ${email}`,
    }, 201);
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;
    console.error('Team invite error:', error);
    return json(corsHeaders, {
      error: error instanceof Error ? error.message : 'Failed to process invitation',
      stage: 'invite',
      requestId: crypto.randomUUID(),
    }, 500);
  }
});

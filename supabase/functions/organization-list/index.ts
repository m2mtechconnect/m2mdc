import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

const json = (corsHeaders: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(corsHeaders, { error: 'Unauthorized' }, 401);

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json(corsHeaders, { error: 'Unauthorized' }, 401);

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('is_approved')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.is_approved) {
      return json(corsHeaders, { error: 'Approved platform account required' }, 403);
    }

    // Platform-owner authority must be a live global grant. A resource-scoped
    // owner label must never unlock cross-customer inventory.
    const { data: isPlatformOwner, error: roleError } = await authClient.rpc('user_has_role', {
      check_user_id: user.id,
      check_role: 'owner',
      check_scope: 'global',
    });
    if (roleError) throw roleError;
    if (isPlatformOwner !== true) {
      return json(corsHeaders, { error: 'Platform owner role required' }, 403);
    }

    // Service role is created only after the caller is authenticated, approved
    // and proven to be a platform owner.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const [organizationsResult, membershipsResult, facilitiesResult, twinsResult, connectionsResult, invitesResult] =
      await Promise.all([
        serviceClient
          .from('organizations')
          .select('id, name, domain, industry, mfa_enabled, sso_enabled, created_at')
          .order('created_at', { ascending: false }),
        serviceClient
          .from('org_memberships')
          .select('org_id, status'),
        serviceClient
          .from('sovereign_dc_facilities')
          .select('org_id')
          .not('org_id', 'is', null),
        serviceClient
          .from('data_centre_twins')
          .select('org_id')
          .not('org_id', 'is', null),
        serviceClient
          .from('connection_instances')
          .select('tenant_id')
          .not('tenant_id', 'is', null),
        serviceClient
          .from('team_invites')
          .select('org_id, email, role, status, expires_at')
          .eq('role', 'owner'),
      ]);

    const firstError = [
      organizationsResult.error,
      membershipsResult.error,
      facilitiesResult.error,
      twinsResult.error,
      connectionsResult.error,
      invitesResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const countBy = (rows: Array<Record<string, unknown>>, key: string, predicate?: (row: Record<string, unknown>) => boolean) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        if (predicate && !predicate(row)) continue;
        const value = row[key];
        if (typeof value !== 'string') continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return counts;
    };

    const memberships = (membershipsResult.data ?? []) as Array<Record<string, unknown>>;
    const activeMembers = countBy(memberships, 'org_id', (row) => row.status === 'active');
    const facilities = countBy((facilitiesResult.data ?? []) as Array<Record<string, unknown>>, 'org_id');
    const twins = countBy((twinsResult.data ?? []) as Array<Record<string, unknown>>, 'org_id');
    const connections = countBy((connectionsResult.data ?? []) as Array<Record<string, unknown>>, 'tenant_id');

    const ownerInviteByOrg = new Map<string, Record<string, unknown>>();
    for (const invite of (invitesResult.data ?? []) as Array<Record<string, unknown>>) {
      const orgId = invite.org_id;
      if (typeof orgId !== 'string') continue;
      const existing = ownerInviteByOrg.get(orgId);
      if (!existing || (existing.status !== 'pending' && invite.status === 'pending')) {
        ownerInviteByOrg.set(orgId, invite);
      }
    }

    const organizations = (organizationsResult.data ?? []).map((organization) => {
      const ownerInvite = ownerInviteByOrg.get(organization.id);
      return {
        ...organization,
        memberCount: activeMembers.get(organization.id) ?? 0,
        facilityCount: facilities.get(organization.id) ?? 0,
        twinCount: twins.get(organization.id) ?? 0,
        connectionCount: connections.get(organization.id) ?? 0,
        ownerInvite: ownerInvite
          ? {
              email: ownerInvite.email,
              status: ownerInvite.status,
              expiresAt: ownerInvite.expires_at,
            }
          : null,
      };
    });

    return json(corsHeaders, { organizations });
  } catch (error) {
    console.error('Organization list error:', error);
    return json(corsHeaders, {
      error: error instanceof Error ? error.message : 'Failed to list organizations',
      requestId: crypto.randomUUID(),
    }, 500);
  }
});

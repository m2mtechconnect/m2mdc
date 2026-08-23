import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

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
    if (!authHeader) {
      return json(corsHeaders, { error: 'Unauthorized', stage: 'authentication' }, 401);
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return json(corsHeaders, { error: 'Unauthorized', stage: 'authentication' }, 401);
    }

    // Platform provisioning is intentionally stricter than organization admin.
    // The privileged client is not constructed until the caller is both an
    // approved account and a platform-level owner with a live global grant.
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('is_approved')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.is_approved) {
      return json(corsHeaders, { error: 'Approved platform account required', stage: 'authorization' }, 403);
    }

    const { data: isPlatformOwner, error: roleError } = await authClient.rpc('user_has_role', {
      check_user_id: user.id,
      check_role: 'owner',
      check_scope: 'global',
    });

    if (roleError) throw roleError;
    if (isPlatformOwner !== true) {
      return json(corsHeaders, { error: 'Platform owner role required', stage: 'authorization' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const domain = typeof body?.domain === 'string' ? body.domain.trim().toLowerCase() : '';
    const industry = typeof body?.industry === 'string' ? body.industry.trim() : '';
    const ownerEmail = typeof body?.ownerEmail === 'string' ? body.ownerEmail.trim().toLowerCase() : '';

    if (!name) {
      return json(corsHeaders, { error: 'Organization name is required', stage: 'validation' }, 400);
    }
    if (!EMAIL_PATTERN.test(ownerEmail)) {
      return json(corsHeaders, { error: 'A valid owner email is required', stage: 'validation' }, 400);
    }

    // Service role is created only after authentication, approval and platform
    // authority all succeed.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

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
      _invited_by: user.id,
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.org_id || !result?.invite_id || !result?.invite_token) {
      throw new Error('Organization provisioning did not return a complete result');
    }

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
        token: result.invite_token,
        expiresAt: result.invite_expires_at,
        delivery: 'pending',
      },
      status: 'pending_owner_acceptance',
    }, 201);
  } catch (error) {
    console.error('Organization provision error:', error);
    return json(corsHeaders, {
      error: error instanceof Error ? error.message : 'Failed to provision organization',
      stage: 'provision',
      requestId: crypto.randomUUID(),
    }, 500);
  }
});

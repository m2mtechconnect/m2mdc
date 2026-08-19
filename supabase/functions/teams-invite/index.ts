import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Roles an invite may confer. Anything outside this list is rejected so an
// invite can never be used to mint privileges the inviter does not hold.
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

// Only these roles may issue invites.
const INVITER_ROLES = ['admin', 'owner'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    // Auth client to verify the calling user (uses their JWT)
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ 
        error: 'Email and role are required',
        stage: 'validation'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const normalisedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalisedEmail)) {
      return new Response(JSON.stringify({ error: 'A valid email address is required', stage: 'validation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!INVITABLE_ROLES.has(String(role))) {
      return new Response(JSON.stringify({ error: 'That role cannot be granted through an invite', stage: 'validation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Service role client for DB operations (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authority check: inviting is an administrative action, so the caller
    // must actually hold admin or owner. Verified server-side against
    // user_roles, never against a client-supplied claim.
    const { data: callerRoles, error: rolesError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', INVITER_ROLES);

    if (rolesError) throw rolesError;

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({
        error: 'You need the admin or owner role to invite team members',
        stage: 'authorization'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select('id, email, role, status, invited_by, expires_at, created_at')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true,
      invite: data,
      message: `Invite sent to ${normalisedEmail}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to send invite',
      stage: 'invite',
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL?.trim() || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const ownerEmail = process.env.AURA_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase() || '';
const allow = process.env.AURA_ALLOW_OWNER_BOOTSTRAP === '1';
const allowManaged = process.env.AURA_ALLOW_MANAGED_OWNER_BOOTSTRAP === '1';

if (!allow) throw new Error('Refusing owner bootstrap: set AURA_ALLOW_OWNER_BOOTSTRAP=1.');
if (!url || !serviceKey || !ownerEmail) {
  throw new Error('VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and AURA_BOOTSTRAP_OWNER_EMAIL are required.');
}
if (/supabase\.(co|io)$/i.test(new URL(url).hostname) && !allowManaged) {
  throw new Error('Refusing managed-project bootstrap without AURA_ALLOW_MANAGED_OWNER_BOOTSTRAP=1.');
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExactlyOneConfirmedUserByEmail(email: string) {
  const matches = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    matches.push(...data.users.filter((user) =>
      user.email?.toLowerCase() === email &&
      Boolean(user.email_confirmed_at) &&
      !user.deleted_at
    ));
    if (data.users.length < 1000) break;
  }
  if (matches.length !== 1) {
    throw new Error(`Owner bootstrap requires exactly one confirmed, non-deleted Auth user; found ${matches.length}.`);
  }
  return matches[0];
}

async function bootstrap() {
  const { data: existingOwners, error: ownerReadError } = await supabase
    .from('user_roles')
    .select('id,user_id,expires_at')
    .eq('role', 'owner')
    .eq('scope', 'global');
  if (ownerReadError) throw ownerReadError;

  const now = Date.now();
  if ((existingOwners ?? []).some((grant) =>
    grant.expires_at === null || new Date(grant.expires_at).getTime() > now
  )) {
    console.log(JSON.stringify({ status: 'skipped', reason: 'active_global_owner_exists' }));
    return;
  }

  const user = await findExactlyOneConfirmedUserByEmail(ownerEmail);
  const { error: grantError } = await supabase.from('user_roles').insert({
    user_id: user.id,
    role: 'owner',
    scope: 'global',
    granted_by: user.id,
    granted_at: new Date().toISOString(),
    expires_at: null,
  });
  if (grantError) throw grantError;

  const { error: auditError } = await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'platform_owner_bootstrapped',
    entity_type: 'user_role',
    entity_id: user.id,
    details: {
      role: 'owner',
      scope: 'global',
      reason: 'Initial platform-owner bootstrap for controlled QA tenant provisioning',
      command: 'bootstrap-platform-owner',
      automatic_repeat: false,
    },
  });
  if (auditError) {
    const { error: rollbackError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('scope', 'global');
    if (rollbackError) {
      throw new Error(`Audit write failed and owner-grant rollback also failed: ${rollbackError.message}`);
    }
    throw auditError;
  }

  const { data: verified, error: verifyError } = await supabase
    .from('user_roles')
    .select('id,user_id,role,scope,expires_at')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('scope', 'global')
    .single();
  if (verifyError || !verified) throw new Error('Owner bootstrap read-back verification failed.');

  console.log(JSON.stringify({ status: 'created', userId: user.id, role: 'owner', scope: 'global' }));
}

bootstrap().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

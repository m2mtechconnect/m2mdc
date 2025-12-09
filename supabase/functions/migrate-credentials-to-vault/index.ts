import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  table: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require admin/executive authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated and has executive role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: hasRole } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'executive' 
    });

    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: 'Executive role required for migration' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dryRun = false, batchSize = 50 } = await req.json().catch(() => ({}));

    console.log(`Starting credential migration (dry run: ${dryRun})`);

    const results: MigrationResult[] = [];

    // Create service role client for migration
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ========== MIGRATE integrations_connections ==========
    const connectionsResult = await migrateIntegrationsConnections(
      serviceClient,
      dryRun,
      batchSize
    );
    results.push(connectionsResult);

    // ========== MIGRATE integrations_tokens ==========
    const tokensResult = await migrateIntegrationsTokens(
      serviceClient,
      dryRun,
      batchSize
    );
    results.push(tokensResult);

    // ========== MIGRATE mcp_credentials ==========
    const mcpResult = await migrateMcpCredentials(
      serviceClient,
      dryRun,
      batchSize
    );
    results.push(mcpResult);

    // ========== MIGRATE integrations ==========
    const integrationsResult = await migrateIntegrations(
      serviceClient,
      dryRun,
      batchSize
    );
    results.push(integrationsResult);

    const summary = {
      dryRun,
      totalMigrated: results.reduce((sum, r) => sum + r.migrated, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      results,
    };

    console.log('Migration completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Migration failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function migrateIntegrationsConnections(
  supabase: any,
  dryRun: boolean,
  batchSize: number
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: 'integrations_connections',
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Find connections with plaintext tokens but no vault IDs
    const { data: connections, error: fetchError } = await supabase
      .from('integrations_connections')
      .select('*')
      .or('vault_access_token_id.is.null,vault_refresh_token_id.is.null')
      .not('access_token', 'is', null)
      .limit(batchSize);

    if (fetchError) throw fetchError;

    result.total = connections?.length || 0;

    for (const conn of connections || []) {
      try {
        // Skip if already migrated
        if (conn.vault_access_token_id && conn.vault_refresh_token_id) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would migrate connection: ${conn.id}`);
          result.migrated++;
          continue;
        }

        // Migrate access token
        let vaultAccessId = conn.vault_access_token_id;
        if (!vaultAccessId && conn.access_token) {
          const { data: accessId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_access_${conn.provider}_${conn.user_id}_${conn.id}`,
              secret_value: conn.access_token
            });

          if (vaultError) throw vaultError;
          vaultAccessId = accessId;
        }

        // Migrate refresh token
        let vaultRefreshId = conn.vault_refresh_token_id;
        if (!vaultRefreshId && conn.refresh_token) {
          const { data: refreshId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_refresh_${conn.provider}_${conn.user_id}_${conn.id}`,
              secret_value: conn.refresh_token
            });

          if (vaultError) throw vaultError;
          vaultRefreshId = refreshId;
        }

        // Update record with vault IDs and clear plaintext
        const { error: updateError } = await supabase
          .from('integrations_connections')
          .update({
            vault_access_token_id: vaultAccessId,
            vault_refresh_token_id: vaultRefreshId,
            access_token: null,
            refresh_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        if (updateError) throw updateError;

        result.migrated++;
        console.log(`Migrated connection: ${conn.id}`);
      } catch (err) {
        result.failed++;
        result.errors.push(`Connection ${conn.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`Failed to migrate connection ${conn.id}:`, err);
      }
    }
  } catch (error) {
    result.errors.push(`Table error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Failed to migrate integrations_connections:', error);
  }

  return result;
}

async function migrateIntegrationsTokens(
  supabase: any,
  dryRun: boolean,
  batchSize: number
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: 'integrations_tokens',
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: tokens, error: fetchError } = await supabase
      .from('integrations_tokens')
      .select('*')
      .or('vault_access_token_id.is.null,vault_refresh_token_id.is.null')
      .not('access_token', 'is', null)
      .limit(batchSize);

    if (fetchError) throw fetchError;

    result.total = tokens?.length || 0;

    for (const token of tokens || []) {
      try {
        if (token.vault_access_token_id && token.vault_refresh_token_id) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would migrate token: ${token.id}`);
          result.migrated++;
          continue;
        }

        let vaultAccessId = token.vault_access_token_id;
        if (!vaultAccessId && token.access_token) {
          const { data: accessId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_token_access_${token.user_id}_${token.app_id}_${token.id}`,
              secret_value: token.access_token
            });

          if (vaultError) throw vaultError;
          vaultAccessId = accessId;
        }

        let vaultRefreshId = token.vault_refresh_token_id;
        if (!vaultRefreshId && token.refresh_token) {
          const { data: refreshId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_token_refresh_${token.user_id}_${token.app_id}_${token.id}`,
              secret_value: token.refresh_token
            });

          if (vaultError) throw vaultError;
          vaultRefreshId = refreshId;
        }

        const { error: updateError } = await supabase
          .from('integrations_tokens')
          .update({
            vault_access_token_id: vaultAccessId,
            vault_refresh_token_id: vaultRefreshId,
            access_token: null,
            refresh_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', token.id);

        if (updateError) throw updateError;

        result.migrated++;
        console.log(`Migrated token: ${token.id}`);
      } catch (err) {
        result.failed++;
        result.errors.push(`Token ${token.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`Failed to migrate token ${token.id}:`, err);
      }
    }
  } catch (error) {
    result.errors.push(`Table error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Failed to migrate integrations_tokens:', error);
  }

  return result;
}

async function migrateMcpCredentials(
  supabase: any,
  dryRun: boolean,
  batchSize: number
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: 'mcp_credentials',
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: credentials, error: fetchError } = await supabase
      .from('mcp_credentials')
      .select('*')
      .or('vault_access_token_id.is.null,vault_refresh_token_id.is.null,vault_api_key_id.is.null')
      .or('access_token.not.is.null,refresh_token.not.is.null,api_key.not.is.null')
      .limit(batchSize);

    if (fetchError) throw fetchError;

    result.total = credentials?.length || 0;

    for (const cred of credentials || []) {
      try {
        if (cred.vault_access_token_id && cred.vault_refresh_token_id && cred.vault_api_key_id) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would migrate MCP credential: ${cred.id}`);
          result.migrated++;
          continue;
        }

        let vaultAccessId = cred.vault_access_token_id;
        if (!vaultAccessId && cred.access_token) {
          const { data: accessId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_mcp_access_${cred.user_id}_${cred.server_id}_${cred.id}`,
              secret_value: cred.access_token
            });

          if (vaultError) throw vaultError;
          vaultAccessId = accessId;
        }

        let vaultRefreshId = cred.vault_refresh_token_id;
        if (!vaultRefreshId && cred.refresh_token) {
          const { data: refreshId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_mcp_refresh_${cred.user_id}_${cred.server_id}_${cred.id}`,
              secret_value: cred.refresh_token
            });

          if (vaultError) throw vaultError;
          vaultRefreshId = refreshId;
        }

        let vaultApiKeyId = cred.vault_api_key_id;
        if (!vaultApiKeyId && cred.api_key) {
          const { data: apiKeyId, error: vaultError } = await supabase
            .rpc('store_secret_in_vault', {
              secret_name: `migrated_mcp_apikey_${cred.user_id}_${cred.server_id}_${cred.id}`,
              secret_value: cred.api_key
            });

          if (vaultError) throw vaultError;
          vaultApiKeyId = apiKeyId;
        }

        const { error: updateError } = await supabase
          .from('mcp_credentials')
          .update({
            vault_access_token_id: vaultAccessId,
            vault_refresh_token_id: vaultRefreshId,
            vault_api_key_id: vaultApiKeyId,
            access_token: null,
            refresh_token: null,
            api_key: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cred.id);

        if (updateError) throw updateError;

        result.migrated++;
        console.log(`Migrated MCP credential: ${cred.id}`);
      } catch (err) {
        result.failed++;
        result.errors.push(`MCP credential ${cred.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`Failed to migrate MCP credential ${cred.id}:`, err);
      }
    }
  } catch (error) {
    result.errors.push(`Table error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Failed to migrate mcp_credentials:', error);
  }

  return result;
}

async function migrateIntegrations(
  supabase: any,
  dryRun: boolean,
  batchSize: number
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: 'integrations',
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .is('vault_credentials_id', null)
      .not('credentials_encrypted', 'is', null)
      .limit(batchSize);

    if (fetchError) throw fetchError;

    result.total = integrations?.length || 0;

    for (const integration of integrations || []) {
      try {
        if (integration.vault_credentials_id) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would migrate integration: ${integration.id}`);
          result.migrated++;
          continue;
        }

        const { data: vaultId, error: vaultError } = await supabase
          .rpc('store_secret_in_vault', {
            secret_name: `migrated_integration_creds_${integration.user_id}_${integration.provider}_${integration.id}`,
            secret_value: integration.credentials_encrypted
          });

        if (vaultError) throw vaultError;

        const { error: updateError } = await supabase
          .from('integrations')
          .update({
            vault_credentials_id: vaultId,
            credentials_encrypted: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);

        if (updateError) throw updateError;

        result.migrated++;
        console.log(`Migrated integration: ${integration.id}`);
      } catch (err) {
        result.failed++;
        result.errors.push(`Integration ${integration.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error(`Failed to migrate integration ${integration.id}:`, err);
      }
    }
  } catch (error) {
    result.errors.push(`Table error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Failed to migrate integrations:', error);
  }

  return result;
}

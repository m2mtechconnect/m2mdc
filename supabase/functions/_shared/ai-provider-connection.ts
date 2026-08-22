import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptCredential } from './credentialVault.ts';
import { resolveCallerTenant } from './connectionTenant.ts';
import {
  AiProviderPolicyError,
  NVIDIA_AI_CONNECTOR_ID,
  NVIDIA_HOSTED_API_BASE,
  selectActiveNvidiaProvider,
  validateNvidiaProviderConfiguration,
  type AiProviderConnectionCandidate,
} from './ai-provider-policy.ts';
import type { RouterEnvironment } from './model-router.ts';

function processRouterEnvironment(): RouterEnvironment {
  return {
    AURA_AI_PROVIDER: Deno.env.get('AURA_AI_PROVIDER'),
    LOVABLE_API_KEY: Deno.env.get('LOVABLE_API_KEY'),
    NVIDIA_API_KEY: Deno.env.get('NVIDIA_API_KEY'),
    NVIDIA_API_BASE_URL: Deno.env.get('NVIDIA_API_BASE_URL'),
    AURA_OPENAI_BASE_URL: Deno.env.get('AURA_OPENAI_BASE_URL'),
    AURA_OPENAI_API_KEY: Deno.env.get('AURA_OPENAI_API_KEY'),
    AURA_MODEL_FAST: Deno.env.get('AURA_MODEL_FAST'),
    AURA_MODEL_REASONING: Deno.env.get('AURA_MODEL_REASONING'),
    AURA_MODEL_SUPERVISOR: Deno.env.get('AURA_MODEL_SUPERVISOR'),
  };
}

export interface RouterEnvironmentResolution {
  env: RouterEnvironment;
  source: 'environment' | 'connection';
  connectionId: string | null;
  tenantId: string | null;
}

/**
 * Resolve the AI provider for one authenticated caller.
 *
 * The Connections control plane may override the environment default only when
 * a single tenant-visible NVIDIA connection is enabled after a passing health
 * check. Its credential is decrypted inside this edge-function process and is
 * never returned to the browser or persisted in run output.
 */
export async function resolveRouterEnvironmentForUser(
  userId: string,
): Promise<RouterEnvironmentResolution> {
  const base = processRouterEnvironment();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRole) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_CONTROL_PLANE_UNAVAILABLE',
      'The AI provider control plane is not configured on the server.',
      503,
    );
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const tenantId = await resolveCallerTenant(admin, userId);
  const { data, error } = await admin
    .from('connection_instances')
    .select('id, connector_id, tenant_id, enabled, status, credential_reference, configuration')
    .eq('connector_id', NVIDIA_AI_CONNECTOR_ID);

  if (error) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_LOOKUP_FAILED',
      'AURA could not resolve the configured AI provider.',
      503,
    );
  }

  const connection = selectActiveNvidiaProvider(
    (data ?? []) as AiProviderConnectionCandidate[],
    tenantId,
  );
  if (!connection) {
    return { env: base, source: 'environment', connectionId: null, tenantId };
  }

  if (!connection.credential_reference) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_CREDENTIAL_REQUIRED',
      'The active NVIDIA provider has no credential reference.',
      409,
    );
  }

  const { data: credential, error: credentialError } = await admin
    .from('connection_credentials')
    .select('ciphertext, status, expires_at')
    .eq('connection_id', connection.id)
    .maybeSingle();

  if (credentialError) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_CREDENTIAL_LOOKUP_FAILED',
      'AURA could not resolve the NVIDIA provider credential.',
      503,
    );
  }
  if (!credential || credential.status !== 'ACTIVE') {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_CREDENTIAL_REQUIRED',
      'The active NVIDIA provider credential is missing or inactive.',
      409,
    );
  }
  if (credential.expires_at && new Date(credential.expires_at).getTime() <= Date.now()) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_CREDENTIAL_EXPIRED',
      'The active NVIDIA provider credential has expired.',
      409,
    );
  }

  const config = validateNvidiaProviderConfiguration(
    (connection.configuration ?? {}) as Record<string, unknown>,
  );
  const apiKey = await decryptCredential(String(credential.ciphertext));

  return {
    env: {
      ...base,
      AURA_AI_PROVIDER: 'nvidia',
      NVIDIA_API_KEY: apiKey,
      NVIDIA_API_BASE_URL: NVIDIA_HOSTED_API_BASE,
      AURA_MODEL_FAST: config.reasoningModel,
      AURA_MODEL_REASONING: config.reasoningModel,
      AURA_MODEL_SUPERVISOR: config.supervisorModel,
    },
    source: 'connection',
    connectionId: connection.id,
    tenantId,
  };
}

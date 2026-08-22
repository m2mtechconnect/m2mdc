import { NVIDIA_OPEN_MODEL_IDS } from './model-router.ts';

export const NVIDIA_AI_CONNECTOR_ID = 'nvidia_ai_provider';
export const NVIDIA_HOSTED_API_BASE = 'https://integrate.api.nvidia.com/v1';

export interface AiProviderConnectionCandidate {
  id: string;
  connector_id: string;
  tenant_id: string | null;
  enabled: boolean;
  status: string;
  credential_reference: string | null;
  configuration?: Record<string, unknown> | null;
}

export class AiProviderPolicyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'AiProviderPolicyError';
  }
}

function visibleToTenant(rowTenantId: string | null, callerTenantId: string | null): boolean {
  return rowTenantId === null || rowTenantId === callerTenantId;
}

/**
 * Select exactly one activated NVIDIA provider for the caller's tenant.
 * A provider is eligible only after a passing model-response health check has
 * promoted the connection to HEALTHY. CONNECTED_NO_DATA is intentionally not
 * accepted for inference providers.
 */
export function selectActiveNvidiaProvider(
  rows: readonly AiProviderConnectionCandidate[],
  callerTenantId: string | null,
): AiProviderConnectionCandidate | null {
  const eligible = rows.filter((row) =>
    row.connector_id === NVIDIA_AI_CONNECTOR_ID &&
    row.enabled === true &&
    row.status === 'HEALTHY' &&
    visibleToTenant(row.tenant_id, callerTenantId),
  );

  const tenantSpecific = callerTenantId
    ? eligible.filter((row) => row.tenant_id === callerTenantId)
    : [];
  const platform = eligible.filter((row) => row.tenant_id === null);
  const preferred = tenantSpecific.length > 0 ? tenantSpecific : platform;

  if (preferred.length === 0) return null;
  if (preferred.length > 1) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_AMBIGUOUS',
      'Multiple active NVIDIA AI provider connections exist for the same scope. Disable all but one before running agents.',
      409,
    );
  }
  return preferred[0];
}

export interface ValidatedNvidiaProviderConfiguration {
  deploymentType: 'nvidia_hosted';
  reasoningModel: string;
  supervisorModel: string;
}

/** Hosted NVIDIA is the only Connections-managed deployment in this phase. */
export function validateNvidiaProviderConfiguration(
  input: Record<string, unknown> | null | undefined,
): ValidatedNvidiaProviderConfiguration {
  const deploymentType = String(input?.deployment_type ?? 'nvidia_hosted');
  if (deploymentType !== 'nvidia_hosted') {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_DEPLOYMENT_NOT_QUALIFIED',
      'Only the NVIDIA hosted deployment is qualified through the Connections control plane. Private inference requires the separately configured private-compatible provider path.',
      409,
    );
  }

  const reasoningModel = String(input?.reasoning_model ?? NVIDIA_OPEN_MODEL_IDS.workhorse);
  const supervisorModel = String(input?.supervisor_model ?? NVIDIA_OPEN_MODEL_IDS.supervisor);

  if (reasoningModel !== NVIDIA_OPEN_MODEL_IDS.workhorse) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_REASONING_MODEL_NOT_QUALIFIED',
      `Reasoning model '${reasoningModel}' is not in the qualified NVIDIA allowlist.`,
      409,
    );
  }
  if (supervisorModel !== NVIDIA_OPEN_MODEL_IDS.supervisor) {
    throw new AiProviderPolicyError(
      'AI_PROVIDER_SUPERVISOR_MODEL_NOT_QUALIFIED',
      `Supervisor model '${supervisorModel}' is not in the qualified NVIDIA allowlist.`,
      409,
    );
  }

  return {
    deploymentType: 'nvidia_hosted',
    reasoningModel,
    supervisorModel,
  };
}

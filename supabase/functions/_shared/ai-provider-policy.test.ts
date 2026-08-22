import { describe, expect, it } from 'vitest';
import {
  AiProviderPolicyError,
  NVIDIA_AI_CONNECTOR_ID,
  selectActiveNvidiaProvider,
  validateNvidiaProviderConfiguration,
} from './ai-provider-policy';

const platform = {
  id: 'platform',
  connector_id: NVIDIA_AI_CONNECTOR_ID,
  tenant_id: null,
  enabled: true,
  status: 'CONNECTED_NO_DATA',
  credential_reference: 'vault:platform#v1',
  configuration: {},
};

const tenant = {
  ...platform,
  id: 'tenant',
  tenant_id: 'tenant-a',
};

describe('AI provider Connections policy', () => {
  it('prefers one tenant-specific active provider over the platform fallback', () => {
    expect(selectActiveNvidiaProvider([platform, tenant], 'tenant-a')?.id).toBe('tenant');
  });

  it('uses the platform provider when no tenant-specific provider is active', () => {
    expect(selectActiveNvidiaProvider([platform], 'tenant-a')?.id).toBe('platform');
  });

  it('ignores disabled and failed provider instances', () => {
    expect(selectActiveNvidiaProvider([
      { ...tenant, enabled: false },
      { ...platform, status: 'FAILED' },
    ], 'tenant-a')).toBeNull();
  });

  it('fails closed when the preferred provider scope is ambiguous', () => {
    expect(() => selectActiveNvidiaProvider([
      tenant,
      { ...tenant, id: 'tenant-2' },
    ], 'tenant-a')).toThrowError(AiProviderPolicyError);
  });

  it('accepts the qualified hosted NVIDIA model pair', () => {
    expect(validateNvidiaProviderConfiguration({})).toMatchObject({
      deploymentType: 'nvidia_hosted',
      reasoningModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      supervisorModel: 'nvidia/nemotron-3-super-120b-a12b',
    });
  });

  it('rejects private NIM in the Connections-managed deployment path', () => {
    expect(() => validateNvidiaProviderConfiguration({ deployment_type: 'private_nim' }))
      .toThrowError(/separately configured OpenAI-compatible provider path/);
  });

  it('rejects unqualified model overrides', () => {
    expect(() => validateNvidiaProviderConfiguration({
      reasoning_model: 'nvidia/unqualified-model',
    })).toThrowError(/qualified NVIDIA allowlist/);
  });
});

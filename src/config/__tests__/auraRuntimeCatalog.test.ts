import { describe, expect, it } from 'vitest';
import {
  AURA_INTELLIGENCE_PROFILES,
  AURA_MANAGED_CAPABILITIES,
  AURA_NATIVE_CAPABILITY_IDS,
  customerFacingRuntimeLabel,
  intelligenceProfileById,
  intelligenceProfileForModel,
} from '@/config/auraRuntimeCatalog';

describe('AURA white-label runtime catalog', () => {
  it('uses AURA product profiles instead of provider names for customer labels', () => {
    expect(AURA_INTELLIGENCE_PROFILES.map((profile) => profile.name)).toEqual([
      'Fast',
      'Balanced',
      'Advanced Reasoning',
      'Research',
      'Vision',
      'Voice',
    ]);

    for (const profile of AURA_INTELLIGENCE_PROFILES) {
      expect(profile.name.toLowerCase()).not.toMatch(/google|gemini|openai|gpt|lovable/);
      expect(profile.description.toLowerCase()).not.toMatch(/google|gemini|openai|gpt|lovable/);
    }
  });

  it('maps unknown model state to Balanced safely', () => {
    expect(intelligenceProfileForModel('unknown/provider-model').id).toBe('balanced');
    expect(intelligenceProfileById('unknown').id).toBe('balanced');
  });

  it('keeps provider metadata internal while exposing AURA runtime labels', () => {
    expect(customerFacingRuntimeLabel('aura_managed')).toBe('AURA Managed');
    expect(customerFacingRuntimeLabel('aura_native')).toBe('AURA Native');
    expect(customerFacingRuntimeLabel('automation')).toBe('AURA Automation');
  });

  it('does not represent managed capabilities as connected runtime evidence', () => {
    expect(AURA_MANAGED_CAPABILITIES.length).toBeGreaterThan(0);
    for (const capability of AURA_MANAGED_CAPABILITIES) {
      expect(['available', 'requires_configuration', 'planned']).toContain(capability.availability);
      expect((capability as Record<string, unknown>).connected).toBeUndefined();
      expect((capability as Record<string, unknown>).healthy).toBeUndefined();
    }
  });

  it('retains AURA-native physical infrastructure capability ids', () => {
    for (const id of ['bacnet_ip', 'modbus_tcp', 'opcua', 'nvidia_dcgm', 'dsx_exchange', 'ddn_infinia']) {
      expect(AURA_NATIVE_CAPABILITY_IDS.has(id)).toBe(true);
    }
  });
});

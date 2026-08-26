import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/enterprise-qa-organization.json';

describe('enterprise QA organization fixture', () => {
  it('is explicitly simulated and cannot claim deployed NVIDIA or DSX runtime capability', () => {
    expect(fixture.classification).toBe('SIMULATED_TEST_DATA');
    expect(fixture.provenance.live).toBe(false);
    expect(fixture.provenance.dsxExchangeDeployed).toBe(false);
    expect(fixture.provenance.nvidiaRuntimeValidated).toBe(false);
    expect(fixture.provenance.simReadyValidated).toBe(false);
  });

  it('covers the tenant personas needed for end-to-end authorization tests', () => {
    expect(fixture.personas.map((persona) => persona.role)).toEqual(expect.arrayContaining([
      'owner', 'admin', 'executive', 'manager', 'engineer',
      'operator', 'compliance', 'data_analyst', 'viewer',
    ]));
    expect(fixture.personas.find((persona) => persona.key === 'owner')?.required).toBe(true);
  });

  it('provides relevant facility, provenance and negative-path states', () => {
    expect(fixture.facilities).toHaveLength(2);
    const primary = fixture.facilities[0];
    expect(primary.metadata.telemetry_states).toEqual(expect.arrayContaining([
      'accepted', 'stale', 'missing', 'rejected', 'conflicting',
    ]));
    expect(primary.metadata.scenarios).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'cooling_degradation', quality: 'simulated' }),
      expect.objectContaining({ state: 'failed', quality: 'simulated' }),
    ]));
    expect(primary.metadata.dsx_exchange.status).toBe('NOT_DEPLOYED');
    expect(primary.metadata.nvidia_runtime.status).toBe('NOT_VALIDATED');
  });
});

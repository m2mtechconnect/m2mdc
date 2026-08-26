import { describe, expect, it } from 'vitest';
import { createFacilitySetup, type FacilityRpcPort, type FacilitySetupInput } from '@/facilities/api';

const input: FacilitySetupInput = {
  name: 'Toronto AI Data Centre',
  city: 'Toronto',
  province: 'Ontario',
  country: 'Canada',
  regionCode: 'canada-central',
  tier: 'Tier IV',
  capacityKw: 5000,
  source: 'build-setup',
};

describe('createFacilitySetup', () => {
  it('invokes the canonical facility RPC with the expected tenant-scoped payload', async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const rpc: FacilityRpcPort = {
      async rpc(fn, args) {
        calls.push({ fn, args });
        return {
          data: [{ location_id: 'location-1', twin_id: 'twin-1' }],
          error: null,
        };
      },
    };

    await expect(createFacilitySetup(input, rpc)).resolves.toEqual({
      location_id: 'location-1',
      twin_id: 'twin-1',
    });

    expect(calls).toEqual([
      {
        fn: 'create_facility_setup',
        args: {
          _name: 'Toronto AI Data Centre',
          _city: 'Toronto',
          _province: 'Ontario',
          _country: 'Canada',
          _region_code: 'canada-central',
          _tier: 'Tier IV',
          _capacity_kw: 5000,
          _source: 'build-setup',
        },
      },
    ]);
  });

  it('fails closed on an RPC error', async () => {
    const rpc: FacilityRpcPort = {
      async rpc() {
        return { data: null, error: { message: 'tenant rejected' } };
      },
    };

    await expect(createFacilitySetup(input, rpc)).rejects.toThrow('tenant rejected');
  });

  it('fails closed when the transaction does not return one canonical facility identity', async () => {
    const rpc: FacilityRpcPort = {
      async rpc() {
        return { data: [], error: null };
      },
    };

    await expect(createFacilitySetup(input, rpc)).rejects.toThrow(
      'Facility transaction did not return a canonical facility',
    );
  });

  it('fails closed when the returned identity is malformed', async () => {
    const rpc: FacilityRpcPort = {
      async rpc() {
        return { data: [{ location_id: 'location-1' }], error: null };
      },
    };

    await expect(createFacilitySetup(input, rpc)).rejects.toThrow(
      'Facility transaction returned an invalid identity',
    );
  });
});

import { supabase } from '@/integrations/supabase/client';

export type FacilitySetupInput = {
  name: string;
  city: string;
  province: string;
  country: string;
  regionCode: string;
  tier: string;
  capacityKw: number;
  source: 'build-setup' | 'manage-facilities';
};

export type FacilitySetupRow = {
  location_id: string;
  twin_id: string;
};

export type FacilityRpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export interface FacilityRpcPort {
  rpc(fn: string, args: Record<string, unknown>): Promise<FacilityRpcResult>;
}

const supabaseFacilityRpc: FacilityRpcPort = {
  async rpc(fn, args) {
    const { data, error } = await supabase.rpc(fn as never, args as never);
    return {
      data,
      error: error ? { message: error.message } : null,
    };
  },
};

export async function createFacilitySetup(
  input: FacilitySetupInput,
  rpc: FacilityRpcPort = supabaseFacilityRpc,
): Promise<FacilitySetupRow> {
  const { data, error } = await rpc.rpc('create_facility_setup', {
    _name: input.name,
    _city: input.city,
    _province: input.province,
    _country: input.country,
    _region_code: input.regionCode,
    _tier: input.tier,
    _capacity_kw: input.capacityKw,
    _source: input.source,
  });

  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error('Facility transaction did not return a canonical facility');
  }

  const row = data[0] as Partial<FacilitySetupRow>;
  if (typeof row.twin_id !== 'string' || typeof row.location_id !== 'string') {
    throw new Error('Facility transaction returned an invalid identity');
  }

  return {
    location_id: row.location_id,
    twin_id: row.twin_id,
  };
}

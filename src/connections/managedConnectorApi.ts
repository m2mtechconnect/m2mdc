/**
 * Read access to the server-owned managed connector capability inventory.
 * The browser never receives a gateway key, credential name or token.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ManagedCapabilityEntry } from './managedConnectors';

export interface ManagedCapabilityResponse {
  correlation_id: string;
  tenant_id: string | null;
  caller_roles: string[];
  entries: ManagedCapabilityEntry[];
}

export function useManagedConnectorCapabilities() {
  return useQuery<ManagedCapabilityResponse | null>({
    queryKey: ['managed-connector-capabilities'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('managed-connector-capabilities', { body: {} });
      if (error) return null;
      return (data as ManagedCapabilityResponse) ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });
}
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
      if (!data || typeof data !== 'object') return null;
      // Defensive normalisation: a partial or mocked response must never
      // reach the UI with a missing `entries` array.
      const payload = data as Partial<ManagedCapabilityResponse>;
      return {
        correlation_id: payload.correlation_id ?? '',
        tenant_id: payload.tenant_id ?? null,
        caller_roles: Array.isArray(payload.caller_roles) ? payload.caller_roles : [],
        entries: Array.isArray(payload.entries) ? payload.entries : [],
      };
    },
    staleTime: 60_000,
    retry: false,
  });
}
export interface ManagedInvocationRecord {
  id: string;
  connection_id: string | null;
  operation_id: string;
  decision: string;
  reason_code: string | null;
  latency_ms: number | null;
  correlation_id: string | null;
  created_at: string;
}

export interface ManagedApprovalRecord {
  id: string;
  operation_id: string;
  status: string;
  expires_at: string | null;
  correlation_id: string | null;
  created_at: string;
}

export interface ManagedUserBindingRecord {
  id: string;
  connector_definition_id: string;
  status: string;
  granted_scopes: string[] | null;
  provider_account_label: string | null;
  consented_at: string | null;
  last_success_at: string | null;
  revoked_at: string | null;
}

export interface ManagedAccessHistory {
  invocations: ManagedInvocationRecord[];
  approvals: ManagedApprovalRecord[];
  userBindings: ManagedUserBindingRecord[];
}

/** Tenant scoped read of managed connector access history. RLS keeps rows tenant/user bound. */
export function useManagedAccessHistory(connectionId: string | null, connectorDefinitionId?: string | null) {
  return useQuery<ManagedAccessHistory>({
    queryKey: ['managed-access-history', connectionId, connectorDefinitionId ?? null],
    enabled: Boolean(connectionId),
    staleTime: 15_000,
    queryFn: async () => {
      const [inv, appr, bindings] = await Promise.all([
        supabase
          .from('managed_connector_invocations')
          .select('id, connection_id, operation_id, decision, reason_code, latency_ms, correlation_id, created_at')
          .eq('connection_id', connectionId as string)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('managed_connector_write_approvals')
          .select('id, operation_id, status, expires_at, correlation_id, created_at')
          .eq('connection_id', connectionId as string)
          .order('created_at', { ascending: false })
          .limit(25),
        connectorDefinitionId
          ? supabase
              .from('managed_user_connections')
              .select('id, connector_definition_id, status, granted_scopes, provider_account_label, consented_at, last_success_at, revoked_at')
              .eq('connector_definition_id', connectorDefinitionId)
              .order('created_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [], error: null } as never),
      ]);
      return {
        invocations: (inv.data ?? []) as ManagedInvocationRecord[],
        approvals: (appr.data ?? []) as ManagedApprovalRecord[],
        userBindings: (bindings.data ?? []) as ManagedUserBindingRecord[],
      };
    },
  });
}

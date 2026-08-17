/**
 * RESTRICTED ENGINEERING SURFACE.
 *
 * Per-user managed binding transport map. Only connectors listed here can be
 * authorized as an AURA Managed User Connection, and only when the client API
 * key env var below is actually present - a missing key fails closed with
 * `managed_client_not_configured` rather than implying availability.
 */
export interface ManagedUserBinding {
  connector_definition_id: string;
  /** Gateway transport key. Never rendered in customer-facing copy. */
  gateway_connector_key: string;
  client_api_key_env: string;
  scopes: string[];
}

export const MANAGED_USER_BINDINGS: ManagedUserBinding[] = [
  {
    connector_definition_id: 'workspace_documents',
    gateway_connector_key: 'google_drive',
    client_api_key_env: 'GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  },
];

export function managedUserBinding(connectorDefinitionId: string): ManagedUserBinding | null {
  return MANAGED_USER_BINDINGS.find((b) => b.connector_definition_id === connectorDefinitionId) ?? null;
}

export function isManagedUserClientConfigured(binding: ManagedUserBinding): boolean {
  return Boolean(Deno.env.get(binding.client_api_key_env));
}

export type ManagedTransportMethod = 'GET' | 'POST';

export interface ManagedConnectorTransport {
  connector_definition_id: string;
  operation_id: string;
  gateway_connector_key: string;
  method: ManagedTransportMethod;
  path: string;
  sends_payload: boolean;
}

const MANAGED_CONNECTOR_TRANSPORTS: ManagedConnectorTransport[] = [
  {
    connector_definition_id: 'search_analytics',
    operation_id: 'search_analytics.sites.list',
    gateway_connector_key: 'google_search_console',
    method: 'GET',
    path: '/webmasters/v3/sites',
    sends_payload: false,
  },
  {
    connector_definition_id: 'search_analytics',
    operation_id: 'search_analytics.query',
    gateway_connector_key: 'google_search_console',
    method: 'POST',
    path: '/webmasters/v3/searchanalytics/query',
    sends_payload: true,
  },
];

/**
 * Server-owned transport resolution. Browser callers never choose provider
 * paths or HTTP methods; an AURA operation id resolves to one exact route.
 */
export function managedTransportFor(
  connectorDefinitionId: string,
  operationId: string,
): ManagedConnectorTransport | null {
  return MANAGED_CONNECTOR_TRANSPORTS.find(
    (route) => route.connector_definition_id === connectorDefinitionId && route.operation_id === operationId,
  ) ?? null;
}

export function managedTransports(): readonly ManagedConnectorTransport[] {
  return MANAGED_CONNECTOR_TRANSPORTS;
}

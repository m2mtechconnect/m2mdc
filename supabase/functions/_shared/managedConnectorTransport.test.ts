import { MANAGED_CONNECTOR_MANIFEST } from './managedConnectorManifest.ts';
import { managedTransportFor, managedTransports } from './managedConnectorTransport.ts';
import { routeIsAllowed } from '../../../gateway/aura-integration-gateway/src/routes.ts';

Deno.test('every runtime shared operation has one server-owned gateway route', () => {
  const runtimeShared = MANAGED_CONNECTOR_MANIFEST.filter(
    (entry) => entry.connection_class === 'MANAGED_SHARED' && entry.eligibility === 'RUNTIME_SHARED_SUPPORTED',
  );

  for (const entry of runtimeShared) {
    if (!entry.gateway_connector_key) throw new Error(`${entry.connector_definition_id} has no gateway connector key`);
    for (const operation of entry.supported_operations) {
      const transport = managedTransportFor(entry.connector_definition_id, operation.id);
      if (!transport) throw new Error(`missing transport for ${entry.connector_definition_id}:${operation.id}`);
      if (transport.gateway_connector_key !== entry.gateway_connector_key) {
        throw new Error(`gateway key mismatch for ${operation.id}`);
      }
      if (!routeIsAllowed(transport.gateway_connector_key, transport.method, transport.path)) {
        throw new Error(`gateway route not allowlisted for ${operation.id}`);
      }
    }
  }
});

Deno.test('read classification does not force GET transport', () => {
  const query = managedTransportFor('search_analytics', 'search_analytics.query');
  if (!query) throw new Error('search analytics query transport missing');
  if (query.method !== 'POST') throw new Error('search analytics query must use POST transport');
  if (!query.sends_payload) throw new Error('search analytics query must send its read-only query payload');
});

Deno.test('transport ids are unique', () => {
  const seen = new Set<string>();
  for (const route of managedTransports()) {
    const key = `${route.connector_definition_id}:${route.operation_id}`;
    if (seen.has(key)) throw new Error(`duplicate transport ${key}`);
    seen.add(key);
  }
});

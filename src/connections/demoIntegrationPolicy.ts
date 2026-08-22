import type { ConnectionInstance } from './model';

export type DemoIntegrationMode = 'LIVE_READ_ONLY' | 'DEMO_DATA' | 'UNAVAILABLE';

const LIVE_CONNECTION_STATES = new Set<ConnectionInstance['status']>([
  'READY_TO_TEST',
  'CONNECTED_NO_DATA',
  'HEALTHY',
  'SYNCING',
  'DEGRADED',
]);

export function managedReadDemoMode(input: {
  runtimeSelectable: boolean;
  whiteLabelReady: boolean;
  connection: ConnectionInstance | null | undefined;
}): DemoIntegrationMode {
  const connection = input.connection;
  if (!input.runtimeSelectable || !input.whiteLabelReady || !connection) return 'DEMO_DATA';
  if (!connection.enabled || !LIVE_CONNECTION_STATES.has(connection.status)) return 'DEMO_DATA';
  return 'LIVE_READ_ONLY';
}

import { describe, expect, it } from 'vitest';
import {
  canAddConnection,
  canRunHealthCheck,
  deriveConnectionStatus,
  isOperationalDataSource,
  summariseConnections,
  STATUS_DESCRIPTORS,
  CONNECTION_STATUSES,
  type ConnectionInstance,
  type ConnectorDefinition,
} from '../model';

const definition = (over: Partial<ConnectorDefinition> = {}): ConnectorDefinition => ({
  id: 'x',
  name: 'X',
  category: 'Facility and OT',
  provider: 'Generic',
  version: '1.0.0',
  implementation_status: 'PLANNED',
  supported_directions: [],
  supported_auth_methods: [],
  supported_data_classes: [],
  supported_protocols: [],
  configuration_schema: {},
  mapping_required: false,
  documentation_url: null,
  validation_status: 'UNVALIDATED',
  runtime_adapter: null,
  availability: 'UNAVAILABLE',
  capability_evidence: [],
  ...over,
});

const connection = (over: Partial<ConnectionInstance> = {}): ConnectionInstance => ({
  id: 'c',
  connector_id: 'x',
  tenant_id: null,
  facility_id: null,
  environment: 'production',
  display_name: 'C',
  status: 'DRAFT',
  data_direction: 'READ',
  endpoint_reference: null,
  credential_reference: null,
  owner_id: null,
  is_system: true,
  enabled: true,
  status_reason: null,
  last_tested_at: null,
  last_success_at: null,
  last_ingest_at: null,
  last_error: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

describe('connection lifecycle', () => {
  it('describes every lifecycle state with a defined meaning', () => {
    CONNECTION_STATUSES.forEach((s) => {
      expect(STATUS_DESCRIPTORS[s].meaning.length).toBeGreaterThan(10);
      expect(STATUS_DESCRIPTORS[s].label.toLowerCase()).not.toBe('available');
    });
  });

  it('reports NOT_DEPLOYED before anything else', () => {
    expect(deriveConnectionStatus({ enabled: true, deployed: false, runtimeAdapter: 'a', implementation: 'IMPLEMENTED', credentialRequired: false, credentialReference: null })).toBe('NOT_DEPLOYED');
  });

  it('reports BLOCKED for an implemented but unwired transport', () => {
    expect(deriveConnectionStatus({ enabled: true, deployed: true, runtimeAdapter: null, implementation: 'IMPLEMENTED_NOT_WIRED', credentialRequired: false, credentialReference: null })).toBe('BLOCKED');
  });

  it('never reports HEALTHY when zero records were received', () => {
    expect(deriveConnectionStatus({ enabled: true, deployed: true, runtimeAdapter: 'a', implementation: 'IMPLEMENTED', credentialRequired: false, credentialReference: null, lastCheckStatus: 'PASSED', recordsReceived: 0 })).toBe('CONNECTED_NO_DATA');
  });

  it('reports DEGRADED when records are rejected', () => {
    expect(deriveConnectionStatus({ enabled: true, deployed: true, runtimeAdapter: 'a', implementation: 'IMPLEMENTED', credentialRequired: false, credentialReference: null, lastCheckStatus: 'PASSED', recordsReceived: 10, recordsRejected: 2 })).toBe('DEGRADED');
  });

  it('requires a credential reference before testing', () => {
    expect(deriveConnectionStatus({ enabled: true, deployed: true, runtimeAdapter: 'a', implementation: 'IMPLEMENTED', credentialRequired: true, credentialReference: null })).toBe('CREDENTIAL_REQUIRED');
  });
});

describe('definition versus instance', () => {
  it('does not allow adding a connection without a runtime adapter', () => {
    expect(canAddConnection(definition())).toBe(false);
    expect(canAddConnection(definition({ implementation_status: 'IMPLEMENTED', runtime_adapter: 'adapter' }))).toBe(true);
  });

  it('only allows health checks where a server-side probe exists', () => {
    expect(canRunHealthCheck(connection({ connector_id: 'mqtt_transport' }))).toBe(false);
    expect(canRunHealthCheck(connection({ connector_id: 'dsx_ingest_gateway' }))).toBe(true);
  });

  it('does not count a platform service or a zero-data source as operational telemetry', () => {
    expect(isOperationalDataSource(connection({ status: 'HEALTHY' }), definition({ category: 'Platform service' }))).toBe(false);
    expect(isOperationalDataSource(connection({ status: 'CONNECTED_NO_DATA' }), definition())).toBe(false);
    expect(isOperationalDataSource(connection({ status: 'HEALTHY' }), definition())).toBe(true);
  });

  it('summarises the current truthful baseline', () => {
    const defs = [
      definition({ id: 'supabase_platform', category: 'Platform service', implementation_status: 'IMPLEMENTED', runtime_adapter: 'supabase-js' }),
      definition({ id: 'dsx_ingest_gateway' }),
      definition({ id: 'mqtt_transport', implementation_status: 'IMPLEMENTED_NOT_WIRED' }),
    ];
    const rows = [
      connection({ id: '1', connector_id: 'supabase_platform', status: 'HEALTHY' }),
      connection({ id: '2', connector_id: 'dsx_ingest_gateway', status: 'CONNECTED_NO_DATA' }),
      connection({ id: '3', connector_id: 'mqtt_transport', status: 'BLOCKED' }),
    ];
    const summary = summariseConnections(rows, defs, 0);
    expect(summary.operationalDataSources).toBe(0);
    expect(summary.platformServices).toBe(1);
    expect(summary.events).toBe(0);
    expect(summary.needsAttention).toBe(1);
    expect(summary.lastIngestAt).toBeNull();
  });
});
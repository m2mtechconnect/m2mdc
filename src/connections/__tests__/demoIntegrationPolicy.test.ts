import { describe, expect, it } from 'vitest';
import { managedReadDemoMode } from '../demoIntegrationPolicy';
import type { ConnectionInstance } from '../model';

function connection(overrides: Partial<ConnectionInstance> = {}): ConnectionInstance {
  return {
    id: 'demo-connection',
    connector_id: 'search_analytics',
    tenant_id: null,
    facility_id: null,
    environment: 'demo',
    display_name: 'Demo Search Analytics',
    status: 'READY_TO_TEST',
    data_direction: 'read',
    endpoint_reference: null,
    credential_reference: null,
    owner_id: null,
    is_system: false,
    enabled: true,
    status_reason: null,
    last_tested_at: null,
    last_success_at: null,
    last_ingest_at: null,
    last_error: null,
    created_at: '2026-08-22T00:00:00Z',
    updated_at: '2026-08-22T00:00:00Z',
    ...overrides,
  };
}

describe('AURA demo integration truth policy', () => {
  it('does not treat catalog availability as a live connection', () => {
    expect(managedReadDemoMode({
      runtimeSelectable: true,
      whiteLabelReady: true,
      connection: null,
    })).toBe('DEMO_DATA');
  });

  it('requires the strict white-label gateway to be ready', () => {
    expect(managedReadDemoMode({
      runtimeSelectable: true,
      whiteLabelReady: false,
      connection: connection(),
    })).toBe('DEMO_DATA');
  });

  it('requires an enabled connection in an eligible runtime state', () => {
    expect(managedReadDemoMode({
      runtimeSelectable: true,
      whiteLabelReady: true,
      connection: connection({ enabled: false }),
    })).toBe('DEMO_DATA');

    expect(managedReadDemoMode({
      runtimeSelectable: true,
      whiteLabelReady: true,
      connection: connection({ status: 'FAILED' }),
    })).toBe('DEMO_DATA');
  });

  it('permits live read-only presentation only when every gate is satisfied', () => {
    expect(managedReadDemoMode({
      runtimeSelectable: true,
      whiteLabelReady: true,
      connection: connection({ status: 'HEALTHY' }),
    })).toBe('LIVE_READ_ONLY');
  });
});

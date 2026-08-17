import { describe, expect, it } from 'vitest';
import {
  authBlocker,
  canPersistDraft,
  emptyWizardDraft,
  isDuplicateScope,
  selectableConnectors,
  validateStep,
  type WizardDraft,
} from '../wizardModel';
import type { ConnectorDefinition } from '../model';

const implemented = {
  id: 'dsx_ingest_gateway',
  name: 'DSX ingest gateway',
  category: 'Facility and OT',
  provider: 'AURA',
  version: '2.0.0',
  implementation_status: 'IMPLEMENTED',
  supported_directions: ['READ'],
  supported_auth_methods: ['jwt', 'mtls'],
  supported_data_classes: ['telemetry'],
  supported_protocols: ['https'],
  configuration_schema: {},
  mapping_required: true,
  documentation_url: null,
  validation_status: 'ENDPOINT_VERIFIED',
  runtime_adapter: 'dsx-ingest',
  availability: 'AVAILABLE',
  capability_evidence: [],
} as ConnectorDefinition;

const planned = { ...implemented, id: 'opcua', implementation_status: 'PLANNED', runtime_adapter: null } as ConnectorDefinition;

function draft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return {
    ...emptyWizardDraft(),
    connector_id: 'dsx_ingest_gateway',
    display_name: 'Montreal DSX ingest',
    data_direction: 'READ',
    data_classes: ['telemetry'],
    auth_method: 'jwt',
    ...overrides,
  };
}

describe('connection setup wizard model', () => {
  it('only offers connectors with a runtime adapter', () => {
    expect(selectableConnectors([implemented, planned]).map((d) => d.id)).toEqual(['dsx_ingest_gateway']);
  });

  it('rejects a connector with no adapter', () => {
    const result = validateStep('connector', draft({ connector_id: 'opcua' }), planned, [], false);
    expect(result.complete).toBe(false);
    expect(result.reason).toMatch(/runtime adapter/);
  });

  it('refuses secret-bearing authentication because no vault exists', () => {
    expect(authBlocker(implemented, 'mtls')).toMatch(/credential vault/);
    expect(authBlocker(implemented, 'jwt')).toBeNull();
    expect(authBlocker(implemented, 'oauth2')).toMatch(/does not support/);
  });

  it('rejects an unsupported direction', () => {
    const result = validateStep('contract', draft({ data_direction: 'WRITE' }), implemented, [], false);
    expect(result.complete).toBe(false);
  });

  it('requires at least one data class', () => {
    const result = validateStep('contract', draft({ data_classes: [] }), implemented, [], false);
    expect(result.complete).toBe(false);
  });

  it('detects a duplicate scope', () => {
    const existing = [{
      connector_id: 'dsx_ingest_gateway',
      environment: 'production',
      tenant_id: null,
      facility_id: null,
      display_name: 'montreal dsx ingest',
    }];
    expect(isDuplicateScope(draft(), existing)).toBe(true);
    expect(validateStep('contract', draft(), implemented, existing, false).complete).toBe(false);
  });

  it('blocks activation until a check has passed', () => {
    expect(validateStep('activate', draft(), implemented, [], false).complete).toBe(false);
    expect(validateStep('activate', draft(), implemented, [], true).complete).toBe(true);
  });

  it('persists the draft only when every pre-persist step is complete', () => {
    expect(canPersistDraft(draft(), implemented, [])).toBe(true);
    expect(canPersistDraft(draft({ display_name: 'x' }), implemented, [])).toBe(false);
    expect(canPersistDraft(draft({ auth_method: 'mtls' }), implemented, [])).toBe(false);
  });
});

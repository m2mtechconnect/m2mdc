import { describe, it, expect } from 'vitest';
import {
  diagnoseContract,
  diagnoseCredentials,
  diagnoseMappings,
  diagnoseTenant,
  isVaultFailureEvent,
  type DiagnosticsConnectionRow,
  type DiagnosticsContractRow,
} from '@/connections/runtimeDiagnostics';

const connection: DiagnosticsConnectionRow = {
  id: 'conn-1',
  connector_id: 'mqtt_transport',
  display_name: 'MQTT transport',
  tenant_id: null,
  status: 'BLOCKED',
  enabled: false,
};

const contract: DiagnosticsContractRow = {
  id: 'contract-1',
  connector_id: 'mqtt_transport',
  direction: 'inbound',
  schema_type: 'json',
  schema_version: '1',
  validation_status: 'VALIDATED',
  unit_rules: { degC: 'degC' },
  timestamp_rules: { authority: 'source' },
  official_source: 'doc',
  checksum: 'abc',
};

describe('contract diagnostics', () => {
  it('reports a missing inbound contract', () => {
    const findings = diagnoseContract('mqtt_transport', null);
    expect(findings[0].code).toBe('NO_INBOUND_CONTRACT');
  });

  it('names the exact missing contract fields', () => {
    const findings = diagnoseContract('mqtt_transport', {
      ...contract,
      unit_rules: {},
      timestamp_rules: null,
      validation_status: 'DRAFT',
      checksum: null,
      official_source: null,
    });
    const missing = findings.find((f) => f.code === 'CONTRACT_MISSING_FIELDS');
    expect(missing?.missingFields).toEqual(['unit_rules', 'timestamp_rules']);
    expect(findings.map((f) => f.code)).toContain('CONTRACT_NOT_VALIDATED');
    expect(findings.map((f) => f.code)).toContain('CONTRACT_MISSING_PROVENANCE');
  });

  it('is silent for a complete contract', () => {
    expect(diagnoseContract('mqtt_transport', contract)).toEqual([]);
  });
});

describe('mapping diagnostics', () => {
  it('explains zero mapping rows', () => {
    expect(diagnoseMappings(connection, [])[0].code).toBe('NO_MAPPING_ROWS');
  });

  it('lists the fields blocking activation', () => {
    const findings = diagnoseMappings(connection, [
      {
        id: 'm1',
        connection_id: 'conn-1',
        source_identifier: 'crah/01/supply',
        data_type: 'number',
        direction: 'INBOUND',
        validation_status: 'INCOMPLETE',
        active: false,
      },
    ]);
    expect(findings[0].code).toBe('MAPPING_INCOMPLETE');
    expect(findings[0].missingFields?.join(' ')).toMatch(/facility/i);
  });

  it('flags a valid mapping that is switched off', () => {
    const findings = diagnoseMappings(connection, [
      {
        id: 'm2',
        connection_id: 'conn-1',
        source_identifier: 'crah/01/supply',
        target_facility_id: 'fac-1',
        target_entity: 'CRAH-01',
        target_property: 'supplyTemperatureC',
        source_unit: 'degC',
        target_unit: 'degC',
        timestamp_rule: 'source_timestamp',
        quality_rule: 'range',
        data_type: 'number',
        direction: 'INBOUND',
        validation_status: 'VALID',
        active: false,
      },
    ]);
    expect(findings[0].code).toBe('MAPPING_VALID_BUT_INACTIVE');
  });
});

describe('credential diagnostics', () => {
  it('distinguishes never attempted from failed vault integration', () => {
    expect(diagnoseCredentials(connection, [], [])[0].code).toBe('NO_VAULTED_CREDENTIAL');

    const failed = diagnoseCredentials(connection, [], [
      { connection_id: 'conn-1', action: 'credential.store_failed', version: 1, created_at: '2026-08-17T10:00:00Z' },
    ]);
    expect(failed[0].code).toBe('VAULT_WRITE_FAILED');
    expect(failed[0].detail).toContain('credential.store_failed');
  });

  it('flags revoked and expired credentials', () => {
    const now = new Date('2026-08-17T12:00:00Z');
    const revoked = diagnoseCredentials(connection, [
      { id: 'c1', connection_id: 'conn-1', status: 'revoked', auth_method: 'password', version: 2, expires_at: null },
    ], [], now);
    expect(revoked[0].code).toBe('CREDENTIAL_REVOKED');

    const expired = diagnoseCredentials(connection, [
      { id: 'c2', connection_id: 'conn-1', status: 'active', auth_method: 'password', version: 3, expires_at: '2026-01-01T00:00:00Z' },
    ], [], now);
    expect(expired[0].code).toBe('CREDENTIAL_EXPIRED');
  });

  it('recognises failure event names', () => {
    expect(isVaultFailureEvent('credential.store_failed')).toBe(true);
    expect(isVaultFailureEvent('credential.stored')).toBe(false);
  });
});

describe('tenant roll-up', () => {
  it('counts zero active mappings and credentials and reports the causes', () => {
    const result = diagnoseTenant({
      tenantId: null,
      connections: [connection],
      contracts: [contract],
      mappings: [],
      credentials: [],
      credentialEvents: [],
    });
    expect(result.activeMappingCount).toBe(0);
    expect(result.activeCredentialCount).toBe(0);
    const codes = result.connections[0].findings.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(['CONNECTION_DISABLED', 'NO_MAPPING_ROWS', 'NO_VAULTED_CREDENTIAL']));
  });

  it('reports an empty tenant', () => {
    const result = diagnoseTenant({
      tenantId: null, connections: [], contracts: [], mappings: [], credentials: [], credentialEvents: [],
    });
    expect(result.tenantFindings[0].code).toBe('NO_CONNECTIONS');
  });
});

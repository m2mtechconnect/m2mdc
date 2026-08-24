import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AURA_CLOUD_DATA_CONNECTORS } from '../../src/integrations/cloudDataConnectorCatalogue';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/integrations/cloudDataConnectorCatalogue.ts'), 'utf8');

describe('AURA cloud data connector catalogue', () => {
  it('contains only the enabled enterprise cloud-data connector set', () => {
    expect(AURA_CLOUD_DATA_CONNECTORS.map((connector) => connector.id)).toEqual([
      'aws_s3',
      'aws_athena',
      'redshift',
      'snowflake',
      'databricks',
      'bigquery',
      'fabric',
      'clickhouse',
    ]);
  });

  it('distinguishes workspace connector availability from AURA runtime connectivity', () => {
    for (const connector of AURA_CLOUD_DATA_CONNECTORS) {
      expect(connector.workspaceConnectorAvailable).toBe(true);
      expect(connector.runtimeStatus).toBe('AURA_RUNTIME_NOT_CONFIGURED');
      expect(connector.connected).toBe(false);
      expect(connector.requiresCustomerCredentials).toBe(true);
    }
  });

  it('keeps Private and Hybrid portability honest', () => {
    for (const connector of AURA_CLOUD_DATA_CONNECTORS) {
      expect(connector.privateRuntimeStatus).toBe('ADAPTER_REQUIRED');
    }
    expect(source).not.toContain('PRIVATE_RUNTIME_AVAILABLE');
    expect(source).not.toContain('CONNECTED');
  });

  it('contains no customer credentials, account identifiers or provider secrets', () => {
    for (const forbidden of [
      'access_key_id', 'secret_access_key', 'client_secret', 'private_key',
      'password:', 'api_key:', 'account_id:', 'project_id:', 'warehouse_id:',
    ]) {
      expect(source.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('does not create a Lovable runtime dependency', () => {
    expect(source).not.toContain('lovable.app');
    expect(source).not.toContain('lovable.dev');
    expect(source).not.toContain('@lovable');
  });

  it('uses truth notes that explicitly deny configured customer connectivity', () => {
    for (const connector of AURA_CLOUD_DATA_CONNECTORS) {
      expect(connector.truthNote.toLowerCase()).toMatch(/no customer/);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildSnapshot,
  edgeFunctionNames,
  schemaNames,
} from '../../scripts/schema-truth/capture-deployed-schema.mjs';

const generatedTypes = `export type Database = {
  public: {
    Tables: {
      beta_table: { Row: {} }
      alpha_table: { Row: {} }
    }
    Views: {
      current_view: { Row: {} }
    }
    Functions: {
      zeta_rpc: { Args: never }
      alpha_rpc: { Args: never }
    }
    Enums: {}
  }
}`;

describe('deployed schema metadata capture', () => {
  it('extracts deterministic database object names from generated types', () => {
    expect(schemaNames(generatedTypes)).toEqual({
      tables: ['alpha_table', 'beta_table'],
      views: ['current_view'],
      functions: ['alpha_rpc', 'zeta_rpc'],
    });
  });

  it('normalizes Supabase Edge Function inventory variants', () => {
    expect(edgeFunctionNames(JSON.stringify([
      { NAME: 'teams-invite' },
      { slug: 'builders-get' },
      { name: 'run-lifecycle' },
    ]))).toEqual(['builders-get', 'run-lifecycle', 'teams-invite']);
  });

  it('builds a metadata-only snapshot without credentials or row data', () => {
    const snapshot = buildSnapshot({
      generatedTypes,
      functionInventory: JSON.stringify([{ name: 'builders-get' }]),
      sourceSha: 'a'.repeat(40),
      projectRef: 'zmewwjizebvublcsmhcz',
      capturedAt: '2026-09-03T12:00:00.000Z',
    });

    expect(snapshot.schema).toBe('aura.deployed-schema.v2');
    expect(snapshot.tables).toEqual(['alpha_table', 'beta_table']);
    expect(snapshot.edgeFunctions).toEqual(['builders-get']);
    expect(JSON.stringify(snapshot)).not.toMatch(/token|password|rowData/i);
  });
});

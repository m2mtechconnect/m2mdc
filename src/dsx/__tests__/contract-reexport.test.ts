/**
 * Proves the stable application-facing import surface at
 * `src/dsx/contract.ts` continues to expose `parseDsxEvent`, the schema
 * objects, enums and exported types after the canonical implementation
 * was relocated to `supabase/functions/_shared/dsx-contract.ts`.
 */
import { describe, expect, it } from 'vitest';
import * as viaAppSurface from '../contract';
import * as viaCanonical from '../../../supabase/functions/_shared/dsx-contract';

describe('DSX contract re-export parity', () => {
  it('re-exports the same runtime bindings as the canonical module', () => {
    const appKeys = Object.keys(viaAppSurface).sort();
    const canonicalKeys = Object.keys(viaCanonical).sort();
    expect(appKeys).toEqual(canonicalKeys);
    for (const k of appKeys) {
      expect((viaAppSurface as Record<string, unknown>)[k]).toBe(
        (viaCanonical as Record<string, unknown>)[k],
      );
    }
  });

  it('exposes parseDsxEvent, schema, enums and constants via app surface', () => {
    expect(typeof viaAppSurface.parseDsxEvent).toBe('function');
    expect(viaAppSurface.DsxEventEnvelopeV1Schema).toBeDefined();
    expect(viaAppSurface.SUPPORTED_DSX_SCHEMA_VERSIONS).toContain(1);
    expect(typeof viaAppSurface.DEFAULT_FRESHNESS_BUDGET_MS).toBe('number');
  });
});

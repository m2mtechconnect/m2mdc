import { describe, expect, it } from 'vitest';
import { REFERENCE_ADAPTERS, adapterForPath } from '../referenceAdapters';
import { surfacesByClassification } from '../surfaceRegistry';

const consumers = surfacesByClassification('REFERENCE_DATA_CONSUMER');

describe('reference page identity parity', () => {
  it('every reference consumer route has a route-specific adapter', () => {
    for (const s of consumers) expect(adapterForPath(s.path), s.path).not.toBeNull();
    expect(REFERENCE_ADAPTERS.length).toBe(consumers.length);
  });

  it('page ids and titles are unique: no generic surface substitution', () => {
    expect(new Set(REFERENCE_ADAPTERS.map((a) => a.pageId)).size).toBe(REFERENCE_ADAPTERS.length);
    expect(new Set(REFERENCE_ADAPTERS.map((a) => a.pageTitle)).size).toBe(REFERENCE_ADAPTERS.length);
  });

  it('no two routes render an identical tab/section shape', () => {
    const shapes = REFERENCE_ADAPTERS.map((a) =>
      JSON.stringify(a.tabs.map((t) => [t.id, [...t.sections].sort()])),
    );
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('every tab declares an intent and at least one section', () => {
    for (const a of REFERENCE_ADAPTERS)
      for (const t of a.tabs) {
        expect(t.intent.length, `${a.pageId}/${t.id}`).toBeGreaterThan(10);
        expect(t.sections.length, `${a.pageId}/${t.id}`).toBeGreaterThan(0);
      }
  });

  it('every tab section is declared by its surface registry entry', () => {
    for (const a of REFERENCE_ADAPTERS) {
      const surface = consumers.find((s) => s.path === a.path)!;
      for (const t of a.tabs)
        for (const s of t.sections)
          expect(surface.sections, `${a.pageId}:${s}`).toContain(s);
    }
  });

  it('exports are attributable per page', () => {
    expect(new Set(REFERENCE_ADAPTERS.map((a) => a.exportStem)).size).toBe(
      REFERENCE_ADAPTERS.length,
    );
  });

  it('removed interactions are explained, never silently dropped', () => {
    for (const a of REFERENCE_ADAPTERS)
      for (const l of a.workflowLimitations) expect(l).toMatch(/: |because|until/);
  });
});

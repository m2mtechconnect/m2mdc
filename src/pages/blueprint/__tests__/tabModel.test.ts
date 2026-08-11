import { describe, it, expect } from 'vitest';
import {
  BLUEPRINT_TABS,
  CONTROLS_SUBTABS,
  canonicalTabParams,
  resolveBlueprintTabState,
} from '../tabModel';

describe('Stage 7I — Blueprint tab architecture', () => {
  it('exposes exactly five top-level tabs', () => {
    expect(BLUEPRINT_TABS).toEqual(['model', 'assets', 'controls', 'validation', 'versions']);
    expect(BLUEPRINT_TABS).toHaveLength(5);
  });

  it('nests exactly three Controls subtabs', () => {
    expect(CONTROLS_SUBTABS).toEqual(['agents', 'kpis', 'workflows']);
  });

  it('never exposes agents/kpis/workflows as top-level tabs', () => {
    for (const legacy of ['agents', 'kpis', 'workflows']) {
      expect(BLUEPRINT_TABS as readonly string[]).not.toContain(legacy);
    }
  });

  it('resolves a missing tab param to the model tab without normalization', () => {
    expect(resolveBlueprintTabState(null, null)).toEqual({
      tab: 'model',
      sub: 'agents',
      normalized: false,
    });
  });

  it('normalizes an invalid tab param', () => {
    const state = resolveBlueprintTabState('nope', null);
    expect(state.tab).toBe('model');
    expect(state.normalized).toBe(true);
  });

  it.each([
    ['overview', 'assets', 'agents'],
    ['data', 'assets', 'agents'],
    ['roles', 'assets', 'agents'],
    ['agents', 'controls', 'agents'],
    ['kpis', 'controls', 'kpis'],
    ['workflows', 'controls', 'workflows'],
    ['scenarios', 'model', 'agents'],
  ])('maps the legacy deep link %s to %s/%s', (legacy, tab, sub) => {
    const state = resolveBlueprintTabState(legacy, null);
    expect(state.tab).toBe(tab);
    expect(state.sub).toBe(sub);
    expect(state.normalized).toBe(true);
  });

  it('keeps a canonical controls deep link untouched', () => {
    expect(resolveBlueprintTabState('controls', 'kpis')).toEqual({
      tab: 'controls',
      sub: 'kpis',
      normalized: false,
    });
  });

  it('normalizes controls without an explicit subtab', () => {
    const state = resolveBlueprintTabState('controls', null);
    expect(state.sub).toBe('agents');
    expect(state.normalized).toBe(true);
  });

  it('drops a stale sub param outside Controls', () => {
    const state = resolveBlueprintTabState('model', 'kpis');
    expect(state.normalized).toBe(true);
    expect(canonicalTabParams(state)).toEqual({ tab: 'model' });
  });

  it('emits the subtab in canonical params only for Controls', () => {
    expect(canonicalTabParams(resolveBlueprintTabState('controls', 'workflows'))).toEqual({
      tab: 'controls',
      sub: 'workflows',
    });
  });
});

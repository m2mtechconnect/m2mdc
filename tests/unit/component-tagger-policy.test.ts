/**
 * Contract test for the component-tagger activation policy.
 *
 * Root cause pinned on head 0371589a: `lovable-tagger` attaches a callback
 * `ref` to every JSX element in dev mode, so every function component
 * receives a ref it cannot hold and React 18 floods `console.error` with
 * "Function components cannot be given refs" — once per unique JSX call
 * site. Truth-in-UI gates run against a dev-mode Vite server and assert
 * console cleanliness, so the flood turned the whole suite RED while the
 * production-mode perf gate stayed green on the same head.
 *
 * The remediation is an ENVIRONMENT policy, not a console filter: automated
 * runs disable the tagger via AURA_DISABLE_COMPONENT_TAGGER while normal
 * interactive development keeps it. This test pins that policy.
 */
import { describe, expect, it } from 'vitest';
import {
  COMPONENT_TAGGER_DISABLE_FLAG,
  shouldEnableComponentTagger,
} from '../../scripts/componentTaggerPolicy';

describe('component-tagger activation policy', () => {
  it('enables the tagger for normal interactive development (flag unset)', () => {
    expect(shouldEnableComponentTagger('development', {})).toBe(true);
  });

  it('treats an empty or whitespace-only flag as unset (tagger stays on)', () => {
    expect(shouldEnableComponentTagger('development', { [COMPONENT_TAGGER_DISABLE_FLAG]: '' })).toBe(true);
    expect(shouldEnableComponentTagger('development', { [COMPONENT_TAGGER_DISABLE_FLAG]: '   ' })).toBe(true);
  });

  it('disables the tagger when the flag is set for automated runs', () => {
    expect(shouldEnableComponentTagger('development', { [COMPONENT_TAGGER_DISABLE_FLAG]: '1' })).toBe(false);
    expect(shouldEnableComponentTagger('development', { [COMPONENT_TAGGER_DISABLE_FLAG]: 'true' })).toBe(false);
  });

  it('fails closed: ANY non-empty value disables the tagger (typos cannot re-enable instrumentation in a gate)', () => {
    for (const value of ['0', 'false', 'no', 'off', 'ture', 'yes', 'anything']) {
      expect(shouldEnableComponentTagger('development', { [COMPONENT_TAGGER_DISABLE_FLAG]: value })).toBe(false);
    }
  });

  it('never enables the tagger outside development mode, regardless of the flag', () => {
    expect(shouldEnableComponentTagger('production', {})).toBe(false);
    expect(shouldEnableComponentTagger('production', { [COMPONENT_TAGGER_DISABLE_FLAG]: '' })).toBe(false);
    expect(shouldEnableComponentTagger('test', {})).toBe(false);
  });

  it('exposes the exact flag name the Playwright web servers set', () => {
    expect(COMPONENT_TAGGER_DISABLE_FLAG).toBe('AURA_DISABLE_COMPONENT_TAGGER');
  });
});

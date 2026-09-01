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
  LOVABLE_DEV_SERVER_FLAG,
  componentTaggerOptions,
  isLovableDevServer,
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

/**
 * Activation-parity coverage: lovable-tagger defaults both features to
 * LOVABLE_DEV_SERVER === 'true', so the AURA build must declare the options
 * explicitly instead of inheriting a hidden vendor precondition.
 */
describe('component-tagger activation options', () => {
  it('local interactive development: plugin enabled, jsxSource on, tailwindConfig off', () => {
    const env = {};
    expect(shouldEnableComponentTagger('development', env)).toBe(true);
    expect(componentTaggerOptions(env)).toEqual({ jsxSource: true, tailwindConfig: false });
  });

  it("Lovable dev server: tailwindConfig on only for LOVABLE_DEV_SERVER === 'true'", () => {
    expect(componentTaggerOptions({ [LOVABLE_DEV_SERVER_FLAG]: 'true' }))
      .toEqual({ jsxSource: true, tailwindConfig: true });
    for (const value of ['TRUE', '1', 'yes', '', ' true ']) {
      expect(componentTaggerOptions({ [LOVABLE_DEV_SERVER_FLAG]: value }).tailwindConfig).toBe(false);
    }
  });

  it('automated runs: the disable flag still wins regardless of the vendor flag', () => {
    const env = {
      [COMPONENT_TAGGER_DISABLE_FLAG]: '1',
      [LOVABLE_DEV_SERVER_FLAG]: 'true',
    };
    expect(shouldEnableComponentTagger('development', env)).toBe(false);
  });

  it('exposes the exact vendor flag name and always tags JSX source when enabled', () => {
    expect(LOVABLE_DEV_SERVER_FLAG).toBe('LOVABLE_DEV_SERVER');
    expect(isLovableDevServer({})).toBe(false);
    expect(componentTaggerOptions({}).jsxSource).toBe(true);
    expect(componentTaggerOptions({ [LOVABLE_DEV_SERVER_FLAG]: 'true' }).jsxSource).toBe(true);
  });
});

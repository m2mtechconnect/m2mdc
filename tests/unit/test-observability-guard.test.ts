import { describe, expect, it, vi } from 'vitest';
import { installWindowScrollShim } from '../_setup/browserApiShims';
import { UnexpectedConsoleCollector } from '../_setup/unexpectedConsoleGuard';

describe('test observability gate', () => {
  it('reproduces and rejects the original passing-suite scroll error', () => {
    const collector = new UnexpectedConsoleCollector();
    collector.record(['Error: Not implemented: window.scrollTo']);
    expect(() => collector.assertClean()).toThrow('window.scrollTo');
  });

  it('rejects an analogous unexpected error and redacts URL query material', () => {
    const collector = new UnexpectedConsoleCollector();
    collector.record(['retry failed https://example.invalid/action?token=secret-value']);
    expect(() => collector.assertClean()).toThrow(
      'retry failed https://example.invalid/action?[redacted]',
    );
    expect(() => collector.assertClean()).not.toThrow('secret-value');
  });

  it('accepts only the exact reviewed error count and fails unused expectations', () => {
    const accepted = new UnexpectedConsoleCollector();
    accepted.expect(/expected transport failure/, 1);
    accepted.record(['expected transport failure']);
    expect(() => accepted.assertClean()).not.toThrow();

    const missing = new UnexpectedConsoleCollector();
    missing.expect(/expected transport failure/, 1);
    expect(() => missing.assertClean()).toThrow('missing 1');
  });

  it('implements observable scroll state instead of merely suppressing the API error', () => {
    const scrollListener = vi.fn();
    window.addEventListener('scroll', scrollListener, { once: true });
    installWindowScrollShim();

    window.scrollTo({ left: 24, top: 96, behavior: 'smooth' });

    expect(window.scrollX).toBe(24);
    expect(window.scrollY).toBe(96);
    expect(window.pageXOffset).toBe(24);
    expect(window.pageYOffset).toBe(96);
    expect(scrollListener).toHaveBeenCalledOnce();
  });
});

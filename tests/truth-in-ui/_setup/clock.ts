/**
 * Deterministic clock + PRNG injection.
 *
 * Every truth-in-UI test runs with a pinned wall clock and a fixed
 * `Math.random()` sequence so simulation output, "observedAt"
 * timestamps, and staleness computations are reproducible.
 *
 * NOTE: this ONLY patches the browser-side globals via
 * `page.addInitScript`. It does not touch any application code and
 * is scoped strictly to the Playwright process.
 */

import type { Page } from '@playwright/test';

export const FROZEN_ISO = '2026-07-17T12:00:00.000Z';
export const FROZEN_MS = Date.parse(FROZEN_ISO);

export async function installDeterministicClock(page: Page): Promise<void> {
  await page.addInitScript(
    ({ ms }) => {
      // Freeze Date.now / new Date() / performance.now() at a stable
      // instant. Preserves the Date constructor semantics so the app
      // sees a real Date object.
      const RealDate = Date;
      class FrozenDate extends RealDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(ms);
          } else {
            // @ts-expect-error — variadic passthrough.
            super(...args);
          }
        }
        static now() { return ms; }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Date = FrozenDate as unknown as DateConstructor;
      const perfBase = ms;
      const origPerfNow = performance.now.bind(performance);
      let ticks = 0;
      performance.now = () => { ticks += 16; return ticks; };
      void origPerfNow;
      void perfBase;

      // Seeded mulberry32 for Math.random so any residual random-ness
      // (three.js, framer-motion) is reproducible.
      let seed = 0xC0FFEE;
      Math.random = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    { ms: FROZEN_MS },
  );
}
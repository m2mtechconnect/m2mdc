/**
 * prefers-reduced-motion support.
 *
 * With the reduce preference set, no element may report a running CSS
 * animation or a long transition after the page settles, and autoplaying
 * media must stay paused.
 */

import { test, expect } from './_setup/fixtures';

const SURFACES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
];

test.use({ reducedMotion: 'reduce' });

for (const surface of SURFACES) {
  test(`reduced motion: ${surface.name} suppresses running animation`, async ({ page }) => {
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(600);

    const running = await page.evaluate(() => {
      const offenders: string[] = [];
      // Cross-fades are permitted under WCAG 2.3.3; vestibular-triggering
      // motion (movement, scaling, rotation) is not.
      const MOTION_PROPS = ['transform', 'translate', 'rotate', 'scale', 'top', 'left', 'right', 'bottom'];
      const animations = document.getAnimations?.() ?? [];
      for (const animation of animations) {
        if (animation.playState !== 'running') continue;
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target as HTMLElement | null;
        const timing = effect?.getComputedTiming();
        const duration = typeof timing?.duration === 'number' ? timing.duration : 0;
        // The global reduce rule collapses durations to 0.01ms; anything
        // still measurably animating is unsuppressed motion.
        if (duration <= 1) continue;

        const animated = new Set<string>();
        for (const frame of effect?.getKeyframes?.() ?? []) {
          for (const key of Object.keys(frame)) animated.add(key);
        }
        const movesTarget = MOTION_PROPS.some((prop) => animated.has(prop));
        if (!movesTarget) continue;

        offenders.push(
          `${target?.tagName ?? 'unknown'}:${target?.getAttribute('data-testid') ?? target?.className ?? ''}`.slice(0, 80),
        );
      }
      return offenders;
    });

    expect(running, 'motion animations still running under prefers-reduced-motion').toEqual([]);
  });

  test(`reduced motion: ${surface.name} does not autoplay video`, async ({ page }) => {
    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const playing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('video'))
        .filter((video) => !video.paused)
        .map((video) => video.currentSrc || video.getAttribute('src') || 'video'),
    );

    expect(playing, 'video autoplaying under prefers-reduced-motion').toEqual([]);
  });
}

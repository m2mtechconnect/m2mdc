/**
 * Mobile overflow regression (Builder + Dashboard).
 *
 * Asserts, at the two most common handset viewports:
 *   1. the document does not scroll horizontally at page level;
 *   2. no visible interactive control's bounding box extends past the
 *      right edge of the viewport.
 *
 * This is the deterministic guard for the Builder "Switch Template"
 * secondary control clipping and the Dashboard Action Center density
 * regressions.
 */

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

const VIEWPORTS = [
  { name: 'iphone-x-375x812', width: 375, height: 812 },
  { name: 'iphone-14-390x844', width: 390, height: 844 },
];

const SURFACES = [
  { name: 'builder', path: '/builder' },
  { name: 'dashboard', path: '/dashboard' },
];

test.describe('mobile overflow', () => {
  let mock: Awaited<ReturnType<typeof installSupabaseMock>>;

  test.beforeEach(async ({ context }) => {
    mock = await installSupabaseMock(context);
  });

  for (const viewport of VIEWPORTS) {
    for (const surface of SURFACES) {
      test(`${surface.name} @ ${viewport.name}: no horizontal overflow or clipped controls`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
        await expect.poll(() => mock.profileHits(), { timeout: 15_000 }).toBeGreaterThan(0);
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await page.locator('main').first().waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
          const root = document.scrollingElement ?? document.documentElement;
          const viewportWidth = document.documentElement.clientWidth;
          const offenders: string[] = [];

          /**
           * Controls inside a deliberately pannable / scrollable region (the
           * facility floor plan, a horizontally scrolling table) are reachable
           * by panning, so their page-relative rect says nothing about mobile
           * clipping. Only controls laid out in normal page flow count.
           */
          const insideClippingRegion = (el: Element): boolean => {
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
              const parentStyle = window.getComputedStyle(parent);
              if (parentStyle.overflowX !== 'visible') return true;
              parent = parent.parentElement;
            }
            return false;
          };

          for (const el of Array.from(
            document.querySelectorAll('button, a, input, select, textarea, [role="button"]'),
          )) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            if (insideClippingRegion(el)) continue;
            if (rect.right > viewportWidth + 1) {
              offenders.push(
                `${el.tagName}:${el.getAttribute('data-testid') ?? (el.textContent ?? '').trim().slice(0, 40)}`,
              );
            }
          }
          return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders };
        });


        expect(
          result.scrollWidth,
          `${surface.path} scrolls horizontally at ${viewport.width}px`,
        ).toBeLessThanOrEqual(result.clientWidth + 1);
        expect(
          result.offenders,
          `controls clipped past the right edge on ${surface.path} at ${viewport.width}px`,
        ).toEqual([]);
      });
    }
  }
});

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
test('dbg', async ({ page, context }) => {
  await installSupabaseMock(context);
  await page.goto('/dashboard?rack=A3&action=kpi-pue');
  const d = page.getByTestId('action-detail-drawer');
  await expect(d).toBeVisible();
  await page.waitForTimeout(2000);
  console.log(JSON.stringify(await d.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { tr: cs.transform, anim: cs.animation, x: el.getBoundingClientRect().x, running: el.getAnimations().map((a) => `${(a as any).animationName}:${a.playState}`) };
  })));
});

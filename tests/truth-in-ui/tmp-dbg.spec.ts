import { test, expect } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';
test('dbg', async ({ page, context }) => {
  await installSupabaseMock(context);
  await page.goto('/dashboard?rack=A3&action=kpi-pue');
  const d = page.getByTestId('action-detail-drawer');
  await expect(d).toBeVisible();
  const btn = d.getByRole('button', { name: /close/i }).first();
  const box = (await btn.boundingBox())!;
  console.log('VP', JSON.stringify(page.viewportSize()), 'BOX', JSON.stringify(box));
  const info = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x as number, y as number) as HTMLElement;
    return el ? el.tagName + '|' + el.className.toString().slice(0, 80) : 'none';
  }, [box.x + box.width / 2, box.y + box.height / 2]);
  console.log('ATPOINT', info);
});

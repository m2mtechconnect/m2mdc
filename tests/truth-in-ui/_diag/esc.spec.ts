import { test, expect } from '../_setup/fixtures';
import { installSupabaseMock } from '../_setup/supabase-mock';
import { seedDismissedTours } from '../_setup/app-state';
import { activateCard } from '../_setup/card-activation';

test('diag escape', async ({ page, context }) => {
  await installSupabaseMock(context);
  await seedDismissedTours(context);
  await page.goto('/dsx/evidence-beta', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dsx-workspace-title')).toBeVisible({ timeout: 15_000 });
  const trigger = page.locator('[data-testid^="dsx-constraint-open-"]').last();
  const drawer = page.locator('[data-testid="dsx-constraint-drawer"]');
  await activateCard(page, trigger, drawer, 'diag');
  console.log('DIAG copilotBefore=', await page.evaluate(`(()=>{const el=document.querySelector('[role="dialog"][aria-label="Data Centre Co-Pilot"]'); return el ? el.className.includes('translate-x-0') + '|' + el.getAttribute('aria-hidden') : 'absent';})()`));
  await page.evaluate(`window.__cap=0; window.__bub=0; window.__win=0; window.__stopped=null;
document.addEventListener('keydown', e => { if (e.key === 'Escape') { window.__cap++; const os=e.stopPropagation.bind(e); e.stopPropagation=()=>{window.__stopped=(new Error()).stack; os();}; } }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.__bub++; }, false);
window.addEventListener('keydown', e => { if (e.key === 'Escape') { window.__win++; window.__dp = e.defaultPrevented; } }, false);
window.__openish = () => Array.from(document.querySelectorAll('[data-state="open"], [data-radix-popper-content-wrapper]')).map(el => (el.tagName+'.'+(el.getAttribute('data-testid')||el.getAttribute('role')||el.className.toString().slice(0,40))));`);
  await drawer.press('Escape');
  await page.waitForTimeout(1200);
  console.log('DIAG cap/bub/win/dp=', await page.evaluate('[window.__cap, window.__bub, window.__win, window.__dp]'), 'openish=', JSON.stringify(await page.evaluate('window.__openish()')), 'state=', await drawer.getAttribute('data-state'));
  console.log('DIAG active=', await page.evaluate(`document.activeElement && (document.activeElement.getAttribute('data-testid') || document.activeElement.tagName + '#' + document.activeElement.id)`));
  console.log('DIAG copilotAfter=', await page.evaluate(`(()=>{const el=document.querySelector('[role="dialog"][aria-label="Data Centre Co-Pilot"]'); return el ? el.className.includes('translate-x-0') + '|' + el.getAttribute('aria-hidden') : 'absent';})()`));
  if (false) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    console.log('DIAG afterPageEsc state=', await drawer.getAttribute('data-state'), 'escapes=', await page.evaluate('window.__esc'));
  }
});

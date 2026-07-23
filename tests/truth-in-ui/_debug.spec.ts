import { test } from './_setup/fixtures';
import { installSupabaseMock } from './_setup/supabase-mock';

test('debug focus trail', async ({ page, context }) => {
  await installSupabaseMock(context);
  await context.addInitScript(() => {
    const seen = { seen: true, completedAt: new Date().toISOString() };
    const all = ['studioIntro','overview','simulation','blueprint','role_executive','role_manager','role_engineer','role_security_admin']
      .reduce<Record<string, typeof seen>>((a,id)=>{a[id]=seen;return a;},{});
    try { localStorage.setItem('m2m_tour_state_v1', JSON.stringify(all)); } catch {}
    document.addEventListener('focusin', (e) => {
      const t = e.target as HTMLElement;
      console.log('[FOCUSIN]', t.tagName, t.getAttribute('aria-label'), t.className?.toString().slice(0,50));
    }, true);
  });
  page.on('console', (m) => console.log('[b]', m.text()));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(()=>{});
  console.log('=== OPENING ===');
  const launcher = page.getByRole('button', { name: /Open Co-?Pilot/i }).first();
  await launcher.focus();
  await launcher.press('Enter');
  await page.waitForTimeout(500);
  console.log('=== ESC ===');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
});

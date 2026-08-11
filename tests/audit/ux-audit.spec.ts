/** Full-surface UX audit sweep (read-only diagnostics, no assertions besides a report). */
import { expect, type Page } from '@playwright/test';
import { test } from '../truth-in-ui/_setup/fixtures';
import { installSupabaseMock } from '../truth-in-ui/_setup/supabase-mock';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const ROUTES = [
  '/dashboard', '/builder', '/analytics', '/operations', '/intelligence',
  '/account/profile', '/account/settings', '/account/access-control',
  '/compliance', '/teams', '/marketplace', '/app/agents',
  '/blueprint/default', '/simulation/preview', '/help', '/playbook',
  '/data-centre-twin', '/infrastructure', '/admin/signups-dashboard',
  '/dsx/evidence-beta', '/dsx/evidence-beta/thermal', '/dsx/evidence-beta/decisions',
];
const VIEWPORTS = [{ n: 'mobile', w: 390, h: 844 }, { n: 'desktop', w: 1440, h: 900 }];

type Row = Record<string, unknown>;
const rows: Row[] = [];

test('ux audit sweep', async ({ page, context }) => {
  test.setTimeout(900_000);
  await installSupabaseMock(context);
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/net::|ERR_/.test(m.text())) consoleErrors.push(m.text()); });

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const route of ROUTES) {
      const before = consoleErrors.length;
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(400);
        const metrics = await page.evaluate((vw: number) => {
          const de = document.documentElement;
          const overflow = Math.max(0, de.scrollWidth - vw);
          const offenders: string[] = [];
          if (overflow > 1) {
            document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && offenders.length < 6) {
                offenders.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 3).join('.')}`);
              }
            });
          }
          const h1 = document.querySelectorAll('h1').length;
          const mains = document.querySelectorAll('main').length;
          const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
          let skips = 0;
          for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i - 1] > 1) skips++;
          const smallTargets = [...document.querySelectorAll<HTMLElement>('button,a[href],[role="button"]')]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32); }).length;
          const unnamed = [...document.querySelectorAll<HTMLElement>('button,a[href],[role="button"]')]
            .filter((el) => { const r = el.getBoundingClientRect(); if (!r.width) return false;
              return !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.getAttribute('aria-labelledby'); }).length;
          const emDash = (document.body.innerText.match(/\u2014/g) || []).length;
          return { overflow, offenders, h1, mains, skips, smallTargets, unnamed, emDash, text: document.body.innerText.length };
        }, vp.w);
        let axeViolations: { id: string; nodes: number }[] = [];
        if (vp.n === 'desktop') {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
          axeViolations = r.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
        }
        rows.push({ vp: vp.n, route, ...metrics, axe: axeViolations, consoleErrors: consoleErrors.slice(before) });
      } catch (e) {
        rows.push({ vp: vp.n, route, error: (e as Error).message.split('\n')[0] });
      }
    }
  }
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/ux-audit.json', JSON.stringify(rows, null, 2));
  expect(rows.length).toBeGreaterThan(0);
});

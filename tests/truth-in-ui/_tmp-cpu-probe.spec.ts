import { test } from './_setup/fixtures';
import { mockKit } from './_setup/kit-mock';
import fs from 'node:fs';

test('cpu probe', async ({ page }) => {
  test.setTimeout(150_000);
  const client = await page.context().newCDPSession(page);
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 200 });
  await mockKit(page, 'network-unavailable');
  await client.send('Profiler.start');
  await page.goto('/data-centre-twin?demo=true', { waitUntil: 'domcontentloaded' });
  const tab = page.getByRole('tab', { name: 'Sovereignty' });
  await tab.click({ timeout: 60000 });
  const { profile } = await client.send('Profiler.stop');
  fs.writeFileSync('/tmp/browser/dctwin/profile.json', JSON.stringify(profile));
  const self: Record<string, number> = {};
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const total = profile.samples?.length ?? 0;
  for (const id of profile.samples ?? []) {
    const n = byId.get(id); if (!n) continue;
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} @ ${String(f.url).split('/').slice(-1)[0]}:${f.lineNumber}`;
    self[key] = (self[key] ?? 0) + 1;
  }
  const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log('SAMPLES', total);
  for (const [k, v] of top) console.log('SELF', v, k);
});

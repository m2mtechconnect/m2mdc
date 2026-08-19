import { test, expect } from '@playwright/test';
import { installSupabaseMock } from './_setup/supabase-mock';
const ASSET_ORIGIN = process.env.AURA_ASSET_ORIGIN ?? 'https://m2mdc.lovable.app';
test.setTimeout(180_000);
test('debug', async ({ context, page }) => {
  const mock = await installSupabaseMock(context);
  const twinId = '00000000-0000-4000-8000-000000000042';
  const twin = { id: twinId, location_id: null, name: 'T', city: 'Montreal', region_code: 'ca-central-1', tier: '4', capacity_kw: 5000, industry: 'data_centre', sovereignty_level: 'sovereign', pue_target: 1.2, renewable_target_pct: 80, carbon_intensity: 25, metadata: {}, blueprint_id: null, created_by_user: mock.session.userId, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
  await context.route('**/rest/v1/data_centre_twins*', async (route) => {
    const wantsSingle = (route.request().headers()['accept'] ?? '').includes('pgrst.object');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(wantsSingle ? twin : [twin]) });
  });
  await context.addInitScript((id) => localStorage.setItem('dc_active_twin_id', id), twinId);
  const api = await test.request.newContext();
  const failures: string[] = [];
  await context.route('**/__l5e/assets-v1/**', async (route) => {
    const url = new URL(route.request().url());
    const local = await route.fetch().catch(() => null);
    const type = local?.headers()['content-type'] ?? '';
    if (local && local.ok() && !type.includes('text/html')) { await route.fulfill({ response: local }); return; }
    const upstream = await api.get(`${ASSET_ORIGIN}${url.pathname}`);
    if (upstream.status() >= 400) failures.push(`${upstream.status()} ${url.pathname}`);
    await route.fulfill({ status: upstream.status(), contentType: 'model/gltf-binary', headers: { 'access-control-allow-origin': '*' }, body: await upstream.body() });
  });
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto('/data-centre-twin?geometry=nvidia-reference', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('twin-visualization-layout')).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(25_000);
  const snap = await page.evaluate(() => {
    const c = (window as any).__auraRuntimeCoverage?.();
    const f = (window as any).__auraFacilityFamilies?.();
    return { roles: c?.roles, rackMounts: c?.rackMounts, aura: c?.auraAuthoredRoles, families: f };
  });
  console.log('FAILURES', JSON.stringify(failures.slice(0, 20), null, 1));
  console.log('AURA', JSON.stringify(snap.aura));
  console.log('KEYS', JSON.stringify(Object.entries(snap.roles as any).map(([k,r]: any) => [k, r.assetId, r.mountedObjects, r.state])));
  console.log('RACKS', Object.values((snap.rackMounts as any) || {}).filter((r: any) => r.mounted).length);
});

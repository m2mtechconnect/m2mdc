import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const DEEP_PERSONA_SCAN = process.env.QA_AUTH_BOOTSTRAP === '1' && process.env.QA_BROWSER === 'chromium';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:8080';
const FORBIDDEN_PLACEHOLDER_COPY = /\b(?:lorem ipsum|coming soon|not implemented|mock data|fake data|placeholder feature|under construction)\b/i;

type Persona = {
  userId: string;
  email: string;
  password: string;
  fullName: string;
};

type PersonaFixture = {
  pending: Persona;
  pilot: Persona;
  tenantViewer: Persona;
  tenantOwner: Persona;
  platformAdmin: Persona;
  platformOwner: Persona;
  roleTarget: Persona;
  orgId: string;
  orgName: string;
};

type AuthenticatedPage = {
  context: BrowserContext;
  page: Page;
  pageErrors: Error[];
};

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();

const service = DEEP_PERSONA_SCAN && serviceRoleKey && supabaseUrl
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

let personas: PersonaFixture;

function requireService() {
  if (!service) throw new Error('Persona scan requires the disposable QA service-role client');
  const parsed = new URL(supabaseUrl!);
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(parsed.hostname)) {
    throw new Error('Persona scan rejected: only a loopback Supabase backend is permitted');
  }
  return service;
}

async function createPersona(label: string, fullName: string, approved: boolean): Promise<Persona> {
  const admin = requireService();
  const token = randomUUID().replace(/-/g, '').slice(0, 16);
  const email = `persona-${label}-${token}@example.invalid`;
  const password = `Aa1!${randomUUID()}Z9!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user?.id) throw error ?? new Error(`Failed to create ${label} persona`);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({ is_approved: approved, full_name: fullName })
    .eq('user_id', data.user.id)
    .select('user_id')
    .single();
  if (profileError || !profile?.user_id) {
    throw profileError ?? new Error(`Profile trigger did not create ${label} persona`);
  }

  return { userId: data.user.id, email, password, fullName };
}

async function provisionPersonas(): Promise<PersonaFixture> {
  const admin = requireService();
  const [pending, pilot, tenantOwner, tenantViewer, platformAdmin, platformOwner, roleTarget] = await Promise.all([
    createPersona('pending', 'Pending Persona', false),
    createPersona('pilot', 'Pilot Persona', true),
    createPersona('tenant-owner', 'Tenant Owner Persona', true),
    createPersona('tenant-viewer', 'Tenant Viewer Persona', true),
    createPersona('platform-admin', 'Platform Admin Persona', true),
    createPersona('platform-owner', 'Platform Owner Persona', true),
    createPersona('role-target', 'Role Target Persona', true),
  ]);

  const suffix = randomUUID().replace(/-/g, '').slice(0, 12);
  const orgName = `Persona QA Organization ${suffix}`;
  const { data: organization, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, domain: `persona-${suffix}.example.invalid`, industry: 'QA' })
    .select('id, name')
    .single();
  if (orgError || !organization?.id) throw orgError ?? new Error('Failed to create persona organization');

  const { error: membershipError } = await admin.from('org_memberships').insert([
    {
      org_id: organization.id,
      user_id: tenantOwner.userId,
      role: 'owner',
      status: 'active',
      is_default: true,
      granted_by: tenantOwner.userId,
    },
    {
      org_id: organization.id,
      user_id: tenantViewer.userId,
      role: 'viewer',
      status: 'active',
      is_default: true,
      granted_by: tenantOwner.userId,
    },
  ]);
  if (membershipError) throw membershipError;

  const { error: profileOrgError } = await admin
    .from('profiles')
    .update({ org_id: organization.id, last_active_org_id: organization.id })
    .in('user_id', [tenantOwner.userId, tenantViewer.userId]);
  if (profileOrgError) throw profileOrgError;

  const { error: platformRoleError } = await admin.from('user_roles').insert([
    {
      user_id: platformAdmin.userId,
      role: 'admin',
      scope: 'global',
      granted_by: platformAdmin.userId,
    },
    {
      user_id: platformOwner.userId,
      role: 'owner',
      scope: 'global',
      granted_by: platformOwner.userId,
    },
  ]);
  if (platformRoleError) throw platformRoleError;

  return {
    pending,
    pilot,
    tenantViewer,
    tenantOwner,
    platformAdmin,
    platformOwner,
    roleTarget,
    orgId: organization.id,
    orgName: organization.name,
  };
}

async function openAs(
  browser: Browser,
  persona: Persona,
  returnTo: string,
  viewport?: { width: number; height: number },
): Promise<AuthenticatedPage> {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
  const page = await context.newPage();
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('Email Address', { exact: true }).fill(persona.email);
  await page.getByLabel('Password', { exact: true }).fill(persona.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForFunction(() => {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const value = window.localStorage.getItem(key);
        if (value && value !== 'null' && value !== 'undefined') return true;
      }
    }
    return false;
  }, undefined, { timeout: 15_000 });

  return { context, page, pageErrors };
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

async function expectNoPlaceholderCopy(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  const visibleText = await page.locator('body').innerText();
  expect(visibleText.trim().length, `${route} rendered no usable content`).toBeGreaterThan(20);
  expect(visibleText, `${route} exposed placeholder/non-implemented copy`).not.toMatch(FORBIDDEN_PLACEHOLDER_COPY);
  await expect(page.getByText(/Fatal Error|Critical Error/i)).toHaveCount(0);
}

test.describe('Persona journeys — real authorization and persisted feature behavior', () => {
  test.skip(!DEEP_PERSONA_SCAN, 'Deep persona scanner runs once on the disposable Chromium QA stack');

  test.beforeAll(async () => {
    personas = await provisionPersonas();
  });

  test('anonymous visitor is sent through real authentication for protected routes', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 10_000 });
      await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('pending user cannot escape approval gating through direct URLs', async ({ browser }) => {
    const { context, page, pageErrors } = await openAs(browser, personas.pending, '/dashboard');
    try {
      await expect(page.getByRole('region', { name: 'Account pending approval' })).toBeVisible({ timeout: 15_000 });
      await page.goto('/admin/customers');
      await expect(page.getByRole('region', { name: 'Account pending approval' })).toBeVisible({ timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('approved user without grants stays inside the real read-only pilot shell', async ({ browser }) => {
    const { context, page, pageErrors } = await openAs(browser, personas.pilot, '/dashboard');
    try {
      await expect(page).toHaveURL(/\/pilot\/overview(?:[/?#]|$)/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: 'Data-centre twins' })).toBeVisible();
      await page.goto('/admin/customers');
      await expect(page).toHaveURL(/\/pilot\/overview(?:[/?#]|$)/, { timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('tenant viewer cannot enter member management or platform administration', async ({ browser }) => {
    const { context, page, pageErrors } = await openAs(browser, personas.tenantViewer, '/dashboard');
    try {
      await page.goto('/teams');
      await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });
      await page.goto('/admin/customers');
      await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('tenant owner creates a real organization invite that survives reload', async ({ browser }) => {
    const admin = requireService();
    const inviteEmail = `invited-${randomUUID().slice(0, 12)}@example.invalid`;
    const { context, page, pageErrors } = await openAs(browser, personas.tenantOwner, '/teams');
    try {
      await expect(page.getByText('People & Access', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(personas.orgName, { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Owner', { exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: 'Invite member' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('Email address').fill(inviteEmail);
      await dialog.getByRole('button', { name: 'Create invitation' }).click();
      await expect(page.getByText(inviteEmail, { exact: true })).toBeVisible({ timeout: 15_000 });

      const { data: invite, error: inviteError } = await admin
        .from('team_invites')
        .select('email, role, status, org_id')
        .eq('email', inviteEmail)
        .eq('org_id', personas.orgId)
        .single();
      expect(inviteError).toBeNull();
      expect(invite).toMatchObject({ email: inviteEmail, role: 'viewer', status: 'pending', org_id: personas.orgId });

      await page.reload();
      await expect(page.getByText(inviteEmail, { exact: true })).toBeVisible({ timeout: 15_000 });
      await page.goto('/admin/customers');
      await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('platform admin grants a real global role and sees it after reload', async ({ browser }) => {
    const admin = requireService();
    const { context, page, pageErrors } = await openAs(browser, personas.platformAdmin, '/teams');
    try {
      await expect(page).toHaveURL(/\/teams\/access-control(?:[/?#]|$)/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: /Access control/i })).toBeVisible();

      await page.getByRole('button', { name: 'Grant Role' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('User Email').fill(personas.roleTarget.email);
      await dialog.getByRole('button', { name: 'Grant Role' }).click();
      await expect(page.getByRole('row').filter({ hasText: personas.roleTarget.email })).toBeVisible({ timeout: 15_000 });

      const { data: grant, error: grantError } = await admin
        .from('user_roles')
        .select('role, scope')
        .eq('user_id', personas.roleTarget.userId)
        .eq('role', 'viewer')
        .eq('scope', 'global')
        .single();
      expect(grantError).toBeNull();
      expect(grant).toEqual({ role: 'viewer', scope: 'global' });

      await page.reload();
      await expect(page.getByRole('row').filter({ hasText: personas.roleTarget.email })).toBeVisible({ timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('platform owner provisions a real customer organization and owner invitation', async ({ browser }) => {
    const admin = requireService();
    const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
    const customerName = `Persona Customer ${suffix}`;
    const ownerEmail = `customer-owner-${suffix}@example.invalid`;
    const { context, page, pageErrors } = await openAs(browser, personas.platformOwner, '/admin/customers');
    try {
      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Add customer' }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Organization name').fill(customerName);
      await dialog.getByLabel('Customer owner email').fill(ownerEmail);
      await dialog.getByRole('button', { name: 'Provision customer' }).click();
      await expect(page.getByText(customerName, { exact: true })).toBeVisible({ timeout: 20_000 });

      const { data: organization, error: orgError } = await admin
        .from('organizations')
        .select('id, name')
        .eq('name', customerName)
        .single();
      expect(orgError).toBeNull();
      expect(organization?.name).toBe(customerName);

      const { data: ownerInvite, error: ownerInviteError } = await admin
        .from('team_invites')
        .select('email, role, status, org_id')
        .eq('org_id', organization!.id)
        .eq('email', ownerEmail)
        .single();
      expect(ownerInviteError).toBeNull();
      expect(ownerInvite).toMatchObject({ email: ownerEmail, role: 'owner', status: 'pending', org_id: organization!.id });

      await page.reload();
      await expect(page.getByText(customerName, { exact: true })).toBeVisible({ timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('builder Start blank creates a persisted backend draft rather than a phantom wizard', async ({ browser }) => {
    const admin = requireService();
    const { context, page, pageErrors } = await openAs(browser, personas.platformAdmin, '/builder');
    try {
      await expect(page.getByRole('heading', { name: /Start a new build/i })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Start blank' }).click();
      await expect(page).toHaveURL(/\/builder\?draft=[0-9a-f-]+/i, { timeout: 20_000 });
      const draftId = new URL(page.url()).searchParams.get('draft');
      expect(draftId).toBeTruthy();

      const { data: draft, error: draftError } = await admin
        .from('agents')
        .select('id, owner_id, status')
        .eq('id', draftId!)
        .single();
      expect(draftError).toBeNull();
      expect(draft).toMatchObject({ id: draftId, owner_id: personas.platformAdmin.userId, status: 'draft' });

      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/builder\\?draft=${draftId}`), { timeout: 15_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('core operational routes expose no obvious placeholder/non-implemented UX copy', async ({ browser }) => {
    const { context, page, pageErrors } = await openAs(browser, personas.platformOwner, '/dashboard');
    try {
      for (const route of [
        '/dashboard',
        '/builder',
        '/marketplace',
        '/manage/integrations',
        '/analytics',
        '/compliance',
        '/account/profile',
        '/account/settings',
      ]) {
        await expectNoPlaceholderCopy(page, route);
      }
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('tenant and platform governance remain usable without document overflow on mobile', async ({ browser }) => {
    const ownerSession = await openAs(browser, personas.tenantOwner, '/teams', { width: 390, height: 844 });
    try {
      await expect(ownerSession.page.getByRole('button', { name: 'Invite member' })).toBeVisible({ timeout: 15_000 });
      await expectNoHorizontalDocumentOverflow(ownerSession.page);
      expect(ownerSession.pageErrors).toEqual([]);
    } finally {
      await ownerSession.context.close();
    }

    const platformSession = await openAs(browser, personas.platformOwner, '/admin/customers', { width: 390, height: 844 });
    try {
      await expect(platformSession.page.getByRole('button', { name: 'Add customer' }).first()).toBeVisible({ timeout: 15_000 });
      await expectNoHorizontalDocumentOverflow(platformSession.page);
      expect(platformSession.pageErrors).toEqual([]);
    } finally {
      await platformSession.context.close();
    }
  });
});

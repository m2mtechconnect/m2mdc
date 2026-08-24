import { chmod } from 'node:fs/promises';
import { chromium, firefox, webkit, expect, type FullConfig } from '@playwright/test';
import {
  createTestServiceSupabaseClient,
  getBrowserTestSession,
  resolveTestUserCredentials,
} from './helpers/testSupabaseClient';

const DEFAULT_AUTH_STATE_PATH = '/tmp/aura-playwright-auth.json';
const QA_LOGIN_ROUTE = '/login?returnTo=%2Faccount%2Fprofile';

async function launchConfiguredBrowser(browserName: string) {
  switch (browserName) {
    case 'chromium':
      return chromium.launch();
    case 'firefox':
      return firefox.launch();
    case 'webkit':
      return webkit.launch();
    default:
      throw new Error('QA browser bootstrap rejected: unsupported or missing browser');
  }
}

/**
 * The broad legacy E2E corpus historically assumed one authenticated user could
 * exercise both platform-admin and tenant-scoped surfaces. Enterprise tenancy
 * correctly separated those authority planes, so the QA fixture must now grant
 * both explicitly instead of relying on a platform role to imply membership.
 *
 * Dedicated persona tests create their own platform-only, tenant-only, viewer,
 * pending and pilot identities and therefore continue to prove the negative
 * authorization boundaries independently.
 */
async function ensureLegacyQaTenantContext(userId: string) {
  const admin = createTestServiceSupabaseClient();
  const suffix = userId.replace(/-/g, '').slice(0, 16);
  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .insert({
      name: `AURA QA Tenant ${suffix}`,
      domain: `qa-${suffix}.example.invalid`,
      industry: 'QA',
    })
    .select('id')
    .single();

  if (organizationError || !organization?.id) {
    throw organizationError ?? new Error('QA tenant fixture organization was not created');
  }

  const { error: membershipError } = await admin.from('org_memberships').insert({
    org_id: organization.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
    is_default: true,
    granted_by: userId,
  });
  if (membershipError) throw membershipError;

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({
      is_approved: true,
      org_id: organization.id,
      last_active_org_id: organization.id,
    })
    .eq('user_id', userId)
    .select('user_id')
    .single();

  if (profileError || profile?.user_id !== userId) {
    throw profileError ?? new Error('QA tenant fixture profile bridge was not established');
  }
}

/**
 * Establishes a real authenticated browser session against the disposable local
 * Supabase stack. This does not bypass application auth/RBAC: the session is
 * created through the committed sign-in UI and the app still validates the
 * session, profile approval and RBAC before protected content can render.
 */
export default async function globalAuthSetup(config: FullConfig) {
  if (process.env.QA_AUTH_BOOTSTRAP !== '1') return;

  const browserName = process.env.QA_BROWSER?.trim();
  if (!browserName) {
    throw new Error('QA browser bootstrap rejected: QA_BROWSER is not configured');
  }

  const authStatePath = process.env.QA_AUTH_STATE?.trim() || DEFAULT_AUTH_STATE_PATH;
  const expectedUserId = process.env.TEST_USER_ID?.trim();
  if (!expectedUserId) {
    throw new Error('QA browser bootstrap rejected: TEST_USER_ID is not configured');
  }

  // The workflow separately grants this identity a global platform-admin role.
  // Add an explicit disposable tenant membership for legacy tenant-scoped suites;
  // never infer tenant authority from the platform role itself.
  await ensureLegacyQaTenantContext(expectedUserId);

  const credentials = resolveTestUserCredentials();
  const project = config.projects.find(({ name }) => name === browserName);
  const configuredBaseURL = project?.use?.baseURL;
  const baseURL =
    typeof configuredBaseURL === 'string'
      ? configuredBaseURL
      : configuredBaseURL?.toString() || 'http://localhost:8080';

  const browser = await launchConfiguredBrowser(browserName);
  try {
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await page.goto(QA_LOGIN_ROUTE);
      await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible({ timeout: 10_000 });
      await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
      await page.getByLabel('Password', { exact: true }).fill(credentials.password);
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
      });

      const session = await getBrowserTestSession(context);
      expect(session.userId).toBe(expectedUserId);

      // The explicit returnTo proves the browser reached the protected route via
      // the normal sign-in contract before storage state is persisted.
      await expect(page).toHaveURL(/\/account\/profile(?:[/?#]|$)/, { timeout: 15_000 });
      await expect(page.locator('h1:has-text("Profile")').first()).toBeVisible({
        timeout: 15_000,
      });

      await context.storageState({ path: authStatePath });
      await chmod(authStatePath, 0o600);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

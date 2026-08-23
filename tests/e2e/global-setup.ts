import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig, StorageState } from '@playwright/test';
import {
  createTestSupabaseClient,
  resolveTestSupabaseConfig,
  resolveTestUserCredentials,
} from '../helpers/testSupabaseClient';

export const QA_ADMIN_STORAGE_STATE = path.resolve('playwright/.auth/qa-admin.json');

function emptyStorageState(): StorageState {
  return { cookies: [], origins: [] };
}

function hasConfiguredTestUser(): boolean {
  return Boolean(process.env.TEST_USER_EMAIL?.trim() && process.env.TEST_USER_PASSWORD);
}

/**
 * Generate the authenticated browser state used only by explicitly protected
 * E2E fixtures. Public and authentication-flow tests continue to start with a
 * clean browser context.
 *
 * The existing test Supabase resolver rejects every non-loopback backend, so a
 * CI or developer environment can never use ambient production credentials by
 * accident. No token, password or session is logged.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  await mkdir(path.dirname(QA_ADMIN_STORAGE_STATE), { recursive: true });

  if (!hasConfiguredTestUser()) {
    // Some suites (for example public accessibility checks) intentionally run
    // without a provisioned user. Keep global setup non-invasive; protected
    // fixtures fail explicitly if selected without credentials.
    await writeFile(
      QA_ADMIN_STORAGE_STATE,
      `${JSON.stringify(emptyStorageState(), null, 2)}\n`,
      { mode: 0o600 },
    );
    return;
  }

  const credentials = resolveTestUserCredentials();
  const backend = resolveTestSupabaseConfig();
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error || !data.session || !data.user?.id) {
    throw new Error('Unable to establish the disposable authenticated E2E session');
  }

  const appBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:8080';
  let appOrigin: string;
  try {
    appOrigin = new URL(appBaseUrl).origin;
  } catch {
    throw new Error('PLAYWRIGHT_BASE_URL is malformed');
  }

  // This is the storage-key algorithm used by supabase-js: the first hostname
  // segment namespaces the persisted auth token. Keeping the derivation here
  // avoids reading protected internals from the auth client.
  const projectRef = new URL(backend.url).hostname.split('.')[0];
  if (!projectRef) throw new Error('Unable to resolve the disposable Supabase storage namespace');
  const storageKey = `sb-${projectRef}-auth-token`;

  const state: StorageState = {
    cookies: [],
    origins: [
      {
        origin: appOrigin,
        localStorage: [
          {
            name: storageKey,
            value: JSON.stringify(data.session),
          },
        ],
      },
    ],
  };

  await writeFile(
    QA_ADMIN_STORAGE_STATE,
    `${JSON.stringify(state, null, 2)}\n`,
    { mode: 0o600 },
  );
}

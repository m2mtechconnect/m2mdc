import { describe, expect, it } from 'vitest';
import {
  clearTenantScopedClientState,
  TENANT_SCOPED_LOCAL_STORAGE_KEYS,
  TENANT_SCOPED_SESSION_STORAGE_KEYS,
  type StorageRemovalTarget,
} from '../tenantStorageIsolation';

function removalRecorder() {
  const removed: string[] = [];
  const storage: StorageRemovalTarget = {
    removeItem(key: string) {
      removed.push(key);
    },
  };
  return { removed, storage };
}

describe('tenant client-state isolation', () => {
  it('purges every legacy tenant-scoped local and session key on organization switch', () => {
    const local = removalRecorder();
    const session = removalRecorder();

    clearTenantScopedClientState(local.storage, session.storage);

    expect(local.removed).toEqual([...TENANT_SCOPED_LOCAL_STORAGE_KEYS]);
    expect(session.removed).toEqual([...TENANT_SCOPED_SESSION_STORAGE_KEYS]);
  });

  it('does not purge user/global preferences', () => {
    const protectedPreferences = [
      'm2m_tour_state_v1',
      'aura_analytics_distinct_id',
      'theme',
      'aura.assistant.width',
      'aura.assistant.open',
      'twin-overlay-preference',
    ];
    const allTenantKeys = new Set([
      ...TENANT_SCOPED_LOCAL_STORAGE_KEYS,
      ...TENANT_SCOPED_SESSION_STORAGE_KEYS,
    ]);

    for (const preference of protectedPreferences) {
      expect(allTenantKeys.has(preference)).toBe(false);
    }
  });
});

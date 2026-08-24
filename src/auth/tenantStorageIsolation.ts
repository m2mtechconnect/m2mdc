export interface StorageRemovalTarget {
  removeItem(key: string): void;
}

/**
 * Browser state that can contain customer-specific identifiers, drafts,
 * recommendations, run results, search history or workflow context.
 *
 * These legacy stores predate organization tenancy and therefore use global
 * storage keys. Until they are namespaced by org id, an organization switch
 * must purge them before the application reloads.
 */
export const TENANT_SCOPED_LOCAL_STORAGE_KEYS = [
  'dc_active_location_id',
  'dc_active_twin_id',
  'selectedTwinId',
  'builder-storage',
  'dc-twin-builder-storage',
  'builder-selection-storage',
  'blueprint-storage',
  'simulation-snapshots',
  'recommendations-storage',
  'dc-twin-changelog',
  'aura-workspace',
  'm2m-date-range-storage',
  'lastSimulationRun',
  'recentSearches',
] as const;

export const TENANT_SCOPED_SESSION_STORAGE_KEYS = [
  'aura.dashboard.layer',
  'last-recommendations-domain',
  'aura.managedUser.pendingConnector',
] as const;

export function clearTenantScopedClientState(
  local: StorageRemovalTarget,
  session: StorageRemovalTarget,
): void {
  for (const key of TENANT_SCOPED_LOCAL_STORAGE_KEYS) local.removeItem(key);
  for (const key of TENANT_SCOPED_SESSION_STORAGE_KEYS) session.removeItem(key);
}

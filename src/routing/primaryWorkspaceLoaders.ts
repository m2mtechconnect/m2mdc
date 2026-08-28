/**
 * Shared loaders for the five permanent AURA workspaces.
 *
 * React.lazy keeps these modules out of the anonymous entry bundle. The shell
 * also calls the same loaders on navigation intent and during an authenticated
 * idle window so a click does not begin a cold multi-chunk fetch.
 */
export const loadDashboard = () => import('@/pages/Dashboard');
export const loadBuilder = () => import('@/pages/Builder');
export const loadOperations = () => import('@/pages/IntelligenceDashboard');
export const loadSimulation = () => import('@/workspace/AuraWorkspace');
export const loadEvidenceShell = () => import('@/pages/dsx/EvidenceBetaShell');
export const loadEvidenceWorkspaces = () => import('@/pages/dsx/workspaces');

type WorkspaceLoader = () => Promise<unknown>;

const WORKSPACE_LOADERS: Record<string, readonly WorkspaceLoader[]> = {
  '/dashboard': [loadDashboard],
  '/builder': [loadBuilder],
  '/analytics': [loadOperations],
  '/simulation': [loadSimulation],
  '/evidence/overview': [loadEvidenceShell, loadEvidenceWorkspaces],
};

const inflight = new Map<string, Promise<unknown[]>>();

function pathnameFor(href: string): string {
  return href.split(/[?#]/, 1)[0] || '/';
}

/** Warm one permanent workspace without navigating or changing authority. */
export function preloadPrimaryWorkspace(href: string): Promise<unknown[]> {
  const pathname = pathnameFor(href);
  const loaders = WORKSPACE_LOADERS[pathname];
  if (!loaders) return Promise.resolve([]);

  const existing = inflight.get(pathname);
  if (existing) return existing;

  const request = Promise.all(loaders.map((load) => load())).catch((error) => {
    // A transient network failure must be retryable on the real navigation.
    inflight.delete(pathname);
    throw error;
  });
  inflight.set(pathname, request);
  return request;
}

export const PRIMARY_WORKSPACE_PATHS = Object.freeze(Object.keys(WORKSPACE_LOADERS));

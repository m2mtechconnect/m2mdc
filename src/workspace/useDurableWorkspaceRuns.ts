import { useEffect } from 'react';
import { useRBAC } from '@/contexts/RBACContext';
import { useWorkspaceStore } from './workspaceStore';

export function durableRunOwnerKey(userId: string | null, activeOrgId: string | null): string | null {
  return userId && activeOrgId ? `${userId}:${activeOrgId}` : null;
}

/** Hydrate the tenant-authoritative run and decision queue on every owning surface. */
export function useDurableWorkspaceRuns(twinId?: string | null): void {
  const { userId, activeOrgId } = useRBAC();
  const hydrateRuns = useWorkspaceStore((state) => state.hydrateRuns);
  const ownerKey = durableRunOwnerKey(userId, activeOrgId);

  useEffect(() => {
    void hydrateRuns(ownerKey, twinId);
  }, [hydrateRuns, ownerKey, twinId]);
}

/**
 * Coverage session identity and owner registration.
 *
 * A session is the stable semantic identity of what is being rendered: the
 * active facility (twin/rack topology) plus the selected geometry mode. It is
 * never a random token, so a re-render, a StrictMode double mount or a
 * remounted child cannot invent a new session and wipe live coverage.
 */
import { useEffect, useMemo } from 'react';
import {
  useRuntimeCoverageStore,
  type CoverageOwnerId,
  type CoveragePriority,
  type RackMountReport,
  type RoleCoverage,
} from './runtimeCoverageStore';
import type { SemanticRole } from './assetRegistry';

export function coverageSessionId(parts: {
  /** Stable identity of the facility being rendered. */
  facilityKey: string;
  /** Selected geometry mode. */
  geometry: string;
}): string {
  return `${parts.geometry}::${parts.facilityKey}`;
}

/**
 * Opens the session for the active facility/geometry pair and closes it when
 * the scene goes away. Re-running with the same id is a no-op, so live reports
 * survive re-renders; a different id clears the previous facility completely.
 */
export function useCoverageSession(
  sessionId: string,
  expected: {
    expectedRoles: SemanticRole[];
    expectedMounts: number;
    /** Compact previews are secondary and never displace the main viewport. */
    priority?: CoveragePriority;
  },
) {
  const expectedRoles = expected.expectedRoles;
  const expectedMounts = expected.expectedMounts;
  const priority = expected.priority ?? 'primary';
  const key = expectedRoles.join(',');
  useEffect(() => {
    useRuntimeCoverageStore.getState().beginSession(sessionId, {
      expectedRoles,
      expectedMounts,
      priority,
    });
    return () => {
      // Only end the session that is still active; a session that already
      // rolled over belongs to the next facility.
      useRuntimeCoverageStore.getState().endSession(sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, key, expectedMounts, priority]);
}

/** Registers one reporting subsystem for the lifetime of the component. */
export function useCoverageOwner(sessionId: string, ownerId: CoverageOwnerId) {
  useEffect(() => {
    const store = useRuntimeCoverageStore.getState();
    store.registerOwner(sessionId, ownerId);
    return () => {
      useRuntimeCoverageStore.getState().unregisterOwner(sessionId, ownerId);
    };
  }, [sessionId, ownerId]);

  return useMemo(
    () => ({
      reportRole: (coverage: RoleCoverage) =>
        useRuntimeCoverageStore.getState().reportRole(sessionId, ownerId, coverage),
      reportMount: (rackId: string, mount: RackMountReport) =>
        useRuntimeCoverageStore.getState().reportMount(sessionId, ownerId, rackId, mount),
    }),
    [sessionId, ownerId],
  );
}

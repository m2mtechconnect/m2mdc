/**
 * The single React entry point for dataset selection.
 *
 * The URL owns the selection. Authority comes from RBAC. Pages never parse the
 * query parameter themselves and never import a mock array while the reference
 * canary is active.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import type { DatasetMode } from '@/data/dsxReference';
import {
  DATASET_PARAM,
  PRODUCTION_DEFAULT_DATASET,
  resolveDataset,
  withDataset,
  type DatasetResolution,
} from './datasetRegistry';
import { recordCanaryEvent } from './canaryEvents';

interface DatasetContextValue extends DatasetResolution {
  /** True when the caller may activate an admin-only dataset. */
  canActivateReference: boolean;
  /** Activate a dataset (URL-owned) and record the event. */
  setDataset: (mode: DatasetMode) => void;
  /** One-action rollback to the production default. */
  rollback: () => void;
  /** Preserve the current dataset across an internal link. */
  linkTo: (path: string) => string;
}

const FALLBACK = resolveDataset(null, { isAdmin: false });

const DatasetContext = createContext<DatasetContextValue>({
  ...FALLBACK,
  canActivateReference: false,
  setDataset: () => undefined,
  rollback: () => undefined,
  linkTo: (p) => p,
});

export function DatasetProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { can, userId } = useRBAC();
  const isAdmin = can('platform.view_admin_console');

  const requested = useMemo(
    () => new URLSearchParams(location.search).get(DATASET_PARAM),
    [location.search],
  );
  const resolution = useMemo(() => resolveDataset(requested, { isAdmin }), [requested, isAdmin]);

  /**
   * The dataset the operator last activated deliberately.
   *
   * The URL remains the single owner of the selection, but most navigation in
   * the app uses plain links that do not carry a query string. Without this,
   * one sidebar click silently dropped the canary back to the production
   * default and rendered legacy synthetic data under no banner at all. The
   * effect below repairs the URL instead of holding a second source of truth:
   * the param is re-applied, so the address bar always states what is in
   * effect, and an explicit rollback clears the intent for good.
   */
  const activeIntent = useRef<DatasetMode | null>(null);
  if (resolution.reason === 'requested' && resolution.canaryActive) {
    activeIntent.current = resolution.mode;
  }

  useEffect(() => {
    const intent = activeIntent.current;
    if (!intent || intent === PRODUCTION_DEFAULT_DATASET) return;
    if (!isAdmin) {
      // Authority was lost mid-session: drop the intent rather than re-asserting it.
      activeIntent.current = null;
      return;
    }
    if (requested !== null) return;
    navigate(withDataset(`${location.pathname}${location.search}`, intent), { replace: true });
  }, [requested, isAdmin, location.pathname, location.search, navigate]);

  const setDataset = useCallback(
    (mode: DatasetMode) => {
      // An explicit selection always wins, including a rollback to the default.
      activeIntent.current = mode === PRODUCTION_DEFAULT_DATASET ? null : mode;
      navigate(withDataset(`${location.pathname}${location.search}`, mode), { replace: false });
      void recordCanaryEvent({
        action: mode === PRODUCTION_DEFAULT_DATASET ? 'rollback' : 'activate',
        dataset: mode,
        actorId: userId,
      });
    },
    [location.pathname, location.search, navigate, userId],
  );

  const rollback = useCallback(() => setDataset(PRODUCTION_DEFAULT_DATASET), [setDataset]);

  const linkTo = useCallback(
    (path: string) => withDataset(path, resolution.mode),
    [resolution.mode],
  );

  const value = useMemo<DatasetContextValue>(
    () => ({ ...resolution, canActivateReference: isAdmin, setDataset, rollback, linkTo }),
    [resolution, isAdmin, setDataset, rollback, linkTo],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  return useContext(DatasetContext);
}

/** True only when the admin reference canary is genuinely in effect. */
export function useReferenceMode(): boolean {
  return useDataset().mode === 'nvidia-dsx-reference';
}

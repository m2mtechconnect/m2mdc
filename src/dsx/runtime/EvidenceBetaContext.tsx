/**
 * Shared Evidence Beta workspace context.
 *
 * One runtime, one asset selection and one provenance drawer are shared by
 * all eleven workspaces so that a selection made anywhere is reflected
 * everywhere. Components never branch on "is this mock data".
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useEvidenceBeta, type EvidenceBetaRuntime } from './useEvidenceBeta';
import { buildConstraintStack, type DomainConstraint } from '../workspaces/constraints';
import { identityByAuraId, type AssetIdentity } from '../workspaces/facilityGraph';
import type { DsxProvenancedMetric } from '../contracts/provenancedMetric';
import { freshnessFor, type FreshnessState } from '../modes';

export interface EvidenceBetaWorkspace {
  rt: EvidenceBetaRuntime;
  freshness: FreshnessState;
  constraints: DomainConstraint[];
  selectedAssetId: string | null;
  selectedAsset: AssetIdentity | null;
  selectAsset: (auraAssetId: string | null) => void;
  provenanceMetric: DsxProvenancedMetric | null;
  openProvenance: (metric: DsxProvenancedMetric) => void;
  closeProvenance: () => void;
}

const Ctx = createContext<EvidenceBetaWorkspace | null>(null);

export function EvidenceBetaProvider({ children }: { children: ReactNode }) {
  const rt = useEvidenceBeta();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [provenanceMetric, setProvenanceMetric] = useState<DsxProvenancedMetric | null>(null);

  const freshness = freshnessFor(rt.snapshot.last_observed_at, Date.parse(rt.nowIso));
  const constraints = useMemo(() => buildConstraintStack(rt.bundle, rt.snapshot), [rt.bundle, rt.snapshot]);
  const selectedAsset = useMemo(() => identityByAuraId(selectedAssetId), [selectedAssetId]);

  const selectAsset = useCallback((id: string | null) => setSelectedAssetId(id), []);
  const openProvenance = useCallback((m: DsxProvenancedMetric) => setProvenanceMetric(m), []);
  const closeProvenance = useCallback(() => setProvenanceMetric(null), []);

  const value: EvidenceBetaWorkspace = {
    rt,
    freshness,
    constraints,
    selectedAssetId,
    selectedAsset,
    selectAsset,
    provenanceMetric,
    openProvenance,
    closeProvenance,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): EvidenceBetaWorkspace {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorkspace must be used inside EvidenceBetaProvider');
  return v;
}
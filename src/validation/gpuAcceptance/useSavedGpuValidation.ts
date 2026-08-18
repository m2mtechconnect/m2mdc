/**
 * Saved hardware GPU validation state for an asset.
 *
 * Thin read adapter over the canonical asset/version/validation model
 * (`assetValidationModel`). It fetches saved runs and hands them to the single
 * resolver, so the promotion rule - a pass only validates the build it ran
 * against - lives in exactly one place. Nothing here writes.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  resolveAssetValidation,
  type AssetValidationResolution,
  type AssetValidationState,
  type SavedValidationRun,
} from './assetValidationModel';

export interface SavedGpuValidation {
  loading: boolean;
  /** True only when a saved run for this asset passed on hardware. */
  gpuValidated: boolean;
  label: string;
  /** Canonical validation state from the single resolver. */
  state: AssetValidationState;
  /** Provenance sentence for the resolved state. */
  evidence: string;
  /** Checksum of the build the state refers to. */
  buildChecksum: string | null;
  lastRun: {
    id: string;
    result: string;
    verdict: string;
    validatedAt: string;
    checksum: string;
  } | null;
  refresh: () => void;
}

export function useSavedGpuValidation(assetId: string): SavedGpuValidation {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<SavedValidationRun[]>([]);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase
      .from('asset_gpu_validation_runs')
      .select('id, acceptance_result, verdict, validated_at, asset_checksum')
      .eq('asset_id', assetId)
      .order('validated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        setRuns(
          (data ?? []).map((row) => ({
            id: row.id,
            acceptanceResult: row.acceptance_result,
            verdict: row.verdict,
            validatedAt: row.validated_at,
            assetChecksum: row.asset_checksum,
          })),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, nonce]);

  const resolution: AssetValidationResolution = resolveAssetValidation(assetId, runs);
  const cited = resolution.currentBuildRun ?? resolution.latestRun;

  return {
    loading,
    gpuValidated: resolution.gpuValidated,
    label: resolution.label,
    state: resolution.state,
    evidence: resolution.evidence,
    buildChecksum: resolution.buildChecksum,
    lastRun: cited
      ? {
          id: cited.id,
          result: cited.acceptanceResult,
          verdict: cited.verdict,
          validatedAt: cited.validatedAt,
          checksum: cited.assetChecksum,
        }
      : null,
    refresh: useCallback(() => setNonce((n) => n + 1), []),
  };
}

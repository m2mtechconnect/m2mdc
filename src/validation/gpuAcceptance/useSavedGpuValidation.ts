/**
 * Saved hardware GPU validation state for an asset.
 *
 * The manifest carries the design-time status; a saved administrator run is
 * the only thing that can promote the simulated scenario to "GPU validated".
 * Nothing here writes: it reads the evidence table only.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getGpuValidationStatus } from '@/components/twin-visualization/assetRegistry';

export interface SavedGpuValidation {
  loading: boolean;
  /** True only when a saved run for this asset passed on hardware. */
  gpuValidated: boolean;
  label: string;
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
  const manifestStatus = getGpuValidationStatus(assetId);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<SavedGpuValidation['lastRun']>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase
      .from('asset_gpu_validation_runs')
      .select('id, acceptance_result, verdict, validated_at, asset_checksum')
      .eq('asset_id', assetId)
      .order('validated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setLastRun(
          data
            ? {
                id: data.id,
                result: data.acceptance_result,
                verdict: data.verdict,
                validatedAt: data.validated_at,
                checksum: data.asset_checksum,
              }
            : null,
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, nonce]);

  const gpuValidated =
    manifestStatus.gpuValidated || lastRun?.result === 'pass';

  return {
    loading,
    gpuValidated,
    label: gpuValidated ? 'GPU validated' : 'Awaiting hardware GPU validation',
    lastRun,
    refresh: useCallback(() => setNonce((n) => n + 1), []),
  };
}

/**
 * useBlueprint - Hook for managing Data Centre Blueprint
 */

import { useState, useEffect, useMemo } from 'react';
import type { DataCentreBlueprint, BlueprintSummary } from '@/types/dataCentreBlueprint';
import { generateDefaultBlueprint } from '@/data/defaultBlueprint';
import { calculateBlueprintSummary } from '@/types/dataCentreBlueprint';

export function useBlueprint(twinId: string) {
  const [blueprint, setBlueprint] = useState<DataCentreBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate default blueprint for the twin
    const bp = generateDefaultBlueprint(twinId);
    setBlueprint(bp);
    setIsLoading(false);
  }, [twinId]);

  const summary = useMemo<BlueprintSummary | null>(() => {
    if (!blueprint) return null;
    return calculateBlueprintSummary(blueprint);
  }, [blueprint]);

  const downloadBlueprint = () => {
    if (!blueprint) return;
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${blueprint.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { blueprint, summary, isLoading, downloadBlueprint };
}

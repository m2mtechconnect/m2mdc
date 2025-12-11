/**
 * useBlueprint - Hook for Managing Data Centre Blueprint
 * Provides reactive access to the authoritative system model
 * 
 * CRITICAL: This hook follows the single source of truth pattern:
 * 1. If twinId is a valid UUID, load from database and merge with defaults
 * 2. If builder store has data, use that as the overlay
 * 3. Fall back to default blueprint
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * DIGITAL TWIN BLUEPRINT STANDARDS:
 * - ISO 23247:2021 Digital Twin Framework for Manufacturing
 *   https://www.iso.org/standard/75066.html
 * - Digital Twin Consortium - Digital Twin System Architecture
 *   https://www.digitaltwinconsortium.org/initiatives/the-definition-of-a-digital-twin/
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DataCentreBlueprint, BlueprintSummary } from '@/types/dataCentreBlueprint';
import { generateDefaultBlueprint } from '@/data/defaultBlueprint';
import { calculateBlueprintSummary } from '@/types/dataCentreBlueprint';
import { supabase } from '@/integrations/supabase/client';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BlueprintLoadSource = 'database' | 'builder' | 'default';

export function useBlueprint(twinId: string) {
  const [blueprint, setBlueprint] = useState<DataCentreBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadSource, setLoadSource] = useState<BlueprintLoadSource>('default');
  const [dbTwinData, setDbTwinData] = useState<any>(null);
  
  // Access builder store state
  const builderOverview = useDCTwinBuilderStore((s) => s.overview);
  const hasBuilderData = builderOverview?.twinName && 
    builderOverview.twinName !== 'New Data Centre Twin' &&
    builderOverview.twinName.length > 0;

  useEffect(() => {
    let mounted = true;
    
    async function loadBlueprint() {
      setIsLoading(true);
      
      try {
        // Priority 1: If twinId is a valid UUID, try to load from database
        if (UUID_REGEX.test(twinId)) {
          console.log('[useBlueprint] Loading from database for UUID:', twinId);
          
          const { data, error } = await supabase
            .from('data_centre_twins')
            .select('*')
            .eq('id', twinId)
            .maybeSingle();
          
          if (!error && data && mounted) {
            setDbTwinData(data);
            
            // Generate base blueprint with twin's data overlaid
            const baseBp = generateDefaultBlueprint(twinId);
            
            // Overlay database values onto the default blueprint
            const bp: DataCentreBlueprint = {
              ...baseBp,
              id: data.id,
              twinId: data.id,
              name: data.name || baseBp.name,
              location: `${data.city}, ${data.region_code}`,
              tier: data.tier || baseBp.tier,
              capacityKw: data.capacity_kw || baseBp.capacityKw,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
            
            setBlueprint(bp);
            setLoadSource('database');
            console.log('[useBlueprint] Loaded from database:', data.name);
            setIsLoading(false);
            return;
          }
          
          if (error) {
            console.warn('[useBlueprint] Database load error:', error.message);
          }
        }
        
        // Priority 2: If builder store has data (from scan/recommendation), use it as overlay
        if (hasBuilderData && mounted) {
          console.log('[useBlueprint] Overlaying builder store data:', builderOverview.twinName);
          const baseBp = generateDefaultBlueprint(twinId);
          
          // Overlay builder values onto the default blueprint
          const bp: DataCentreBlueprint = {
            ...baseBp,
            id: builderOverview.twinSlug || twinId,
            twinId: builderOverview.twinSlug || twinId,
            name: builderOverview.twinName || baseBp.name,
            location: builderOverview.facilityLocation || baseBp.location,
            tier: builderOverview.tier || baseBp.tier,
            capacityKw: builderOverview.capacityKw || baseBp.capacityKw,
          };
          
          setBlueprint(bp);
          setLoadSource('builder');
          setIsLoading(false);
          return;
        }
        
        // Priority 3: Fall back to default blueprint
        if (mounted) {
          console.log('[useBlueprint] Using default blueprint');
          const bp = generateDefaultBlueprint(twinId);
          setBlueprint(bp);
          setLoadSource('default');
        }
      } catch (err) {
        console.error('[useBlueprint] Error loading blueprint:', err);
        // Fall back to default on error
        if (mounted) {
          const bp = generateDefaultBlueprint(twinId);
          setBlueprint(bp);
          setLoadSource('default');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadBlueprint();
    
    return () => {
      mounted = false;
    };
  }, [twinId, hasBuilderData, builderOverview]);

  const summary = useMemo<BlueprintSummary | null>(() => {
    if (!blueprint) return null;
    return calculateBlueprintSummary(blueprint);
  }, [blueprint]);

  const downloadBlueprint = useCallback(() => {
    if (!blueprint) return;
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${blueprint.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [blueprint]);

  return { 
    blueprint, 
    summary, 
    isLoading, 
    downloadBlueprint,
    loadSource,
    dbTwinData, // Expose raw DB data for debugging
  };
}

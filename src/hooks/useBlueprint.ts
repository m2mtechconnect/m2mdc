/**
 * useBlueprint - Hook for Managing Data Centre Blueprint
 * Provides reactive access to the authoritative system model
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
 * - NVIDIA Omniverse Digital Twin Platform
 *   https://developer.nvidia.com/omniverse
 * 
 * DATA CENTER CONFIGURATION MANAGEMENT:
 * - DCIM (Data Center Infrastructure Management) Best Practices
 *   https://uptimeinstitute.com/resources/research-and-reports
 * - TIA-942-B Data Center Standards
 *   https://tiaonline.org/what-we-do/standards/
 * - Uptime Institute M&O Stamp Requirements
 *   https://uptimeinstitute.com/tier-certification/management-operations
 * 
 * BLUEPRINT EXPORT/AUDIT STANDARDS:
 * - ISO 27001 Asset Management Documentation
 *   https://www.iso.org/isoiec-27001-information-security.html
 * - SOC 2 Type II Configuration Documentation Requirements
 *   https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/socforserviceorganizations.html
 * 
 * REACT PATTERNS:
 * - React State Management with useState/useEffect
 *   https://react.dev/reference/react/useState
 * - React useMemo for Derived State
 *   https://react.dev/reference/react/useMemo
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
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

/**
 * useBlueprintScenarios - Hook to get simulation scenarios from Blueprint
 * Merges blueprint-defined scenarios with preset scenarios for simulation
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SCENARIO PLANNING STANDARDS:
 * - Uptime Institute Abnormal Incident Reports (AIRs)
 *   https://uptimeinstitute.com/resources/asset/2024-annual-outages-analysis
 * - NFPA 110 Emergency Power System Testing Requirements
 *   https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=110
 * - ASHRAE TC 9.9 Thermal Event Response Guidelines
 *   https://tc0909.ashraetcs.org/documents.php
 * 
 * INCIDENT SIMULATION METHODOLOGIES:
 * - Chaos Engineering Principles (Netflix/AWS)
 *   https://principlesofchaos.org/
 * - Google Site Reliability Engineering - Game Days
 *   https://sre.google/sre-book/testing-for-reliability/
 * - ITIL Incident Management Practice Guide
 *   https://www.axelos.com/certifications/itil-service-management
 * 
 * DATA CENTER FAILURE MODES:
 * - Uptime Institute Data Center Outage Analysis Reports
 *   https://uptimeinstitute.com/data-center-outages
 * - IEEE 762 Power Systems Reliability
 *   https://standards.ieee.org/standard/762-2006.html
 * 
 * REACT PATTERNS:
 * - React useMemo for Expensive Computations
 *   https://react.dev/reference/react/useMemo
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { useBlueprint } from './useBlueprint';
import { convertAllBlueprintScenarios, mergeWithPresetScenarios } from '@/simulation/blueprintScenarioAdapter';
import { PRESET_SCENARIOS } from '@/simulation/scenarioRegistry';
import type { ScenarioDefinition } from '@/simulation/types';

interface UseBlueprintScenariosReturn {
  scenarios: ScenarioDefinition[];
  blueprintScenarios: ScenarioDefinition[];
  presetScenarios: ScenarioDefinition[];
  isLoading: boolean;
  scenarioCount: number;
}

/**
 * Get simulation scenarios from the Blueprint, merged with preset scenarios
 */
export function useBlueprintScenarios(twinId: string = 'default'): UseBlueprintScenariosReturn {
  const { blueprint, isLoading } = useBlueprint(twinId);
  
  const result = useMemo(() => {
    if (!blueprint) {
      return {
        scenarios: PRESET_SCENARIOS,
        blueprintScenarios: [],
        presetScenarios: PRESET_SCENARIOS,
        scenarioCount: PRESET_SCENARIOS.length,
      };
    }
    
    const blueprintScenarios = convertAllBlueprintScenarios(blueprint.simulationScenarios);
    const mergedScenarios = mergeWithPresetScenarios(PRESET_SCENARIOS, blueprint.simulationScenarios);
    
    return {
      scenarios: mergedScenarios,
      blueprintScenarios,
      presetScenarios: PRESET_SCENARIOS,
      scenarioCount: mergedScenarios.length,
    };
  }, [blueprint]);
  
  return {
    ...result,
    isLoading,
  };
}

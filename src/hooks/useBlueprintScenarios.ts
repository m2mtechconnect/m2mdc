/**
 * useBlueprintScenarios - Hook to get simulation scenarios from Blueprint
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

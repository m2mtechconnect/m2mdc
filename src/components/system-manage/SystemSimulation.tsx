/**
 * SystemSimulation - Unified simulation component for all DC twins
 * Uses the universal DCSimulationPanel with all enhanced features
 */

import { DCSimulationPanel } from '@/components/simulation/DCSimulationPanel';
import type { DeployedSystem } from '@/types/system';

interface SystemSimulationProps {
  system: DeployedSystem;
}

export function SystemSimulation({ system }: SystemSimulationProps) {
  return (
    <DCSimulationPanel 
      twinId={system.id} 
    />
  );
}

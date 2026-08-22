/**
 * Data Centre Simulation Module
 * Public exports for simulation engine and components
 */

// Types
export * from './types';

// Scenario Registry
export * from './scenarioRegistry';

// Blueprint Scenario Adapter
export * from './blueprintScenarioAdapter';

// Fidelity and calibration evidence contracts
export * from './fidelity';
export * from './calibrationEvidence';

// Simulation Engine
export { SimulationEngine, getSimulationEngine, resetSimulationEngine, getSimulationEngineTwinId } from './SimulationEngine';

// Simulation Guards
export * from './useSimulationGuards';

// Custom Scenario Builder utilities
export { createCustomScenario } from './customScenarioBuilder';

// React Hook
export { useSimulation, type UseSimulationReturn, type UseSimulationOptions } from './useSimulation';

// Components
export { SimulationPreviewModal } from '@/components/simulation/SimulationPreviewModal';
export { SimulationChecklist } from '@/components/simulation/SimulationChecklist';

/**
 * Data Centre Digital Twin
 * Central export for all twin components and utilities
 */

// Types
export * from '@/types/dataCenterTwin';

// Mock Data
export { 
  generateDataCentreFacility,
  montrealSovereignDC,
  sovereignQCFacility,
  prairieABFacility,
  getAllDemoFacilities,
  getDemoFacilityById,
  generateGpuUsageCurve,
  generateCoolingTemperatureCycles,
  generatePowerDrawHistory,
  generateCarbonIntensityHistory,
} from './mockData';

// Simulation Scenarios
export {
  SIMULATION_SCENARIOS,
  getScenarioById,
  getScenariosByDomain,
  getScenariosBySeverity,
  getScenarioSuggestions,
  SCENARIO_CATEGORIES,
} from './simulationScenarios';

// Simulation Engine — re-exported from the compat module behind the
// simulation provider boundary (ADR-0007, Phase 1B.4). New consumers must
// depend on `src/simulation/api.ts` instead of this barrel.
export {
  calculateBaseKpis,
  applyScenarioDeltas,
  generateScenarioEvents,
  createSimulationRun,
  updateSimulationRun,
  generatePlaybook,
  playbookToMarkdown,
} from '@/simulation/compat/dataCenterEngine';

// Master Template Configuration
export { 
  DataCentreMasterTemplate, 
  MASTER_TEMPLATE_CONFIG,
  DOMAIN_DEFINITIONS,
  SIMULATION_SCENARIOS as MASTER_SCENARIOS,
  BUILDER_STEP_CONFIGS,
  COPILOT_CAPABILITIES,
} from './MasterTemplate';

// Template Definition
export const DATA_CENTRE_TEMPLATE_ID = 'data-centre-digital-twin';
export const DATA_CENTRE_TEMPLATE_SLUG = 'data-centre-twin';

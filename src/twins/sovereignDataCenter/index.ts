/**
 * Sovereign Green AI Data Centre Twin
 * Central export for all twin components and utilities
 */

// Types
export * from '@/types/sovereignDataCenterTwin';

// Mock Data
export { 
  telusSovereignFacility, 
  prairieMegaFacility, 
  getDemoSimulationRuns,
  getDemoFacilityById,
  getAllDemoFacilities
} from './mockData';

// Simulation helpers. Phase 2: `runSimulation` is NO LONGER re-exported here.
// Executing a sovereign scenario goes through `simulationOrchestrator` (the
// `sovereign-scenario` provider) so seeding, timing and provenance are always
// recorded; this barrel exposes only the pure record/suggestion helpers.
export {
  createSimulationRun,
  getScenarioSuggestions,
} from '@/simulation/compat/sovereignDataCenterEngine';

// Playbook Generator
export { 
  generatePlaybook, 
  playbookToMarkdown 
} from './generatePlaybook';

// Template Definition
export { sovereignDataCenterTemplateConfig } from './templateDefinition';

// CoPilot Context
export { 
  buildSovereignDCContext,
  SOVEREIGN_DC_COPILOT_CHIPS,
  getSovereignDCIntroMessage
} from './copilotContext';

// Analytics
export { 
  trackSovereignDCEvent,
  sovereignDCAnalytics
} from './analytics';

// Components
export * from './components';

// Hooks
export { useSovereignDCTwin } from './hooks/useSovereignDCTwin';

// Re-export constant from templateDefinition (single source of truth)
export { SOVEREIGN_DC_TEMPLATE_ID } from './templateDefinition';
export const SOVEREIGN_DC_TEMPLATE_SLUG = 'sovereign-data-center-twin';

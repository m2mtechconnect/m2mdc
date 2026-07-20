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

// Simulation Engine — re-exported from the compat module behind the
// simulation provider boundary (ADR-0007, Phase 1B.6). New consumers must
// depend on `src/simulation/api.ts` instead of this barrel.
export {
  runSimulation,
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

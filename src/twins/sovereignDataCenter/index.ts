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

// Simulation Engine
export { 
  runSimulation, 
  createSimulationRun,
  getScenarioSuggestions 
} from './simulationEngine';

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

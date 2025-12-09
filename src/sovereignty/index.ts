/**
 * Sovereignty & Compliance Engine - Public exports
 */

// Types
export * from './types';

// Engine
export { SovereigntyEngine, getSovereigntyEngine, resetSovereigntyEngine } from './SovereigntyEngine';

// React Hook
export { useSovereignty } from './useSovereignty';

// CoPilot Awareness
export { 
  buildSovereigntyCoPilotContext, 
  generateSovereigntyResponse, 
  SOVEREIGNTY_COPILOT_CHIPS,
  type SovereigntyCoPilotContext 
} from './copilotAwareness';

// Mock Data
export {
  mockDataAssets,
  mockDataFlows,
  mockSovereigntyPolicies,
  mockComplianceFrameworks,
  mockAuditEvents,
  mockSovereigntyBlueprint,
  getJurisdictionDisplayName,
  getClassificationColor,
  getSeverityColor,
} from './mockData';

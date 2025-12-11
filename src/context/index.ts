/**
 * Context Exports
 * Central export point for all context providers
 * Consolidates src/context and src/contexts directories
 */

// Active Twin Context
export { ActiveTwinProvider, useActiveTwin } from './ActiveTwinContext';
export type { DataCentreLocation, DataCentreTwin, ActiveTwinContextValue } from './ActiveTwinContext';

// Blueprint View Context
export { 
  BlueprintViewProvider, 
  useBlueprintView, 
  useBlueprintReadOnly,
  useBlueprintCapabilities,
  useCanEdit,
  useCanShow,
  DESIGNER_CAPABILITIES,
  DESIGN_VIEW_CAPABILITIES,
  SIMULATION_SNAPSHOT_CAPABILITIES,
  SNAPSHOT_CAPABILITIES, // Legacy alias
} from './BlueprintViewContext';
export type { BlueprintViewMode, BlueprintModeCapabilities } from './BlueprintViewContext';

// Re-export from src/contexts for backward compatibility
// This consolidates both directories into a single import point
export { CoPilotProvider, useCoPilot } from '../contexts/CoPilotContext';
export { CoPilotCommandProvider, useCoPilotCommands, useRegisterCoPilotCommands } from '../contexts/CoPilotCommandContext';
export type { CoPilotCommands } from '../contexts/CoPilotCommandContext';
export { RBACProvider, useRBAC } from '../contexts/RBACContext';
export type { AppRole } from '../contexts/RBACContext';
export { TwinProvider, useTwinContext, useTwinHydration, useTwinQuery, HYDRATION_EVENTS } from '../contexts/TwinContext';
export type { DataCentreTwin as TwinContextDataCentreTwin } from '../contexts/TwinContext';

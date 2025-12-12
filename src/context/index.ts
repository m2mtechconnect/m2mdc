/**
 * Context Exports
 * Central export point for all context providers
 * 
 * CRITICAL: ActiveTwinContext is the SINGLE SOURCE OF TRUTH for active twin selection.
 * - Use useActiveTwin() for all twin-related state
 * - TwinContext is DEPRECATED and should not be used for new code
 * - Header dropdown controls the entire studio via ActiveTwinContext
 * - Recommendations/Builder store are for preview mode only, never override active twin
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE TWIN CONTEXT - PRIMARY SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════════
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

// Twin Overlay Context - Single source of truth for 3D overlay state
export { 
  TwinOverlayProvider, 
  useTwinOverlay, 
  useTwinOverlaySafe,
  OVERLAY_CONFIG,
} from './TwinOverlayContext';
export type { TwinOverlay, TwinOverlayState } from './TwinOverlayContext';

// ═══════════════════════════════════════════════════════════════════════════════
// OTHER CONTEXTS (Re-exported from src/contexts for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════
export { CoPilotProvider, useCoPilot } from '../contexts/CoPilotContext';
export { CoPilotCommandProvider, useCoPilotCommands, useRegisterCoPilotCommands } from '../contexts/CoPilotCommandContext';
export type { CoPilotCommands } from '../contexts/CoPilotCommandContext';
export { RBACProvider, useRBAC } from '../contexts/RBACContext';
export type { AppRole } from '../contexts/RBACContext';

// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED: TwinContext - Use ActiveTwinContext instead
// This is only exported for backward compatibility with existing code
// ═══════════════════════════════════════════════════════════════════════════════
/** @deprecated Use useActiveTwin() from ActiveTwinContext instead */
export { TwinProvider, useTwinContext, useTwinHydration, useTwinQuery, HYDRATION_EVENTS } from '../contexts/TwinContext';
/** @deprecated Use DataCentreTwin from ActiveTwinContext instead */
export type { DataCentreTwin as TwinContextDataCentreTwin } from '../contexts/TwinContext';

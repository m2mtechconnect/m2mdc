/**
 * Blueprint View Context - Designer vs Snapshot Mode
 * ENFORCES separation between editable Blueprint Designer and read-only Simulation Snapshot
 * 
 * RULES:
 * - Designer Mode: Full editing, no live telemetry, no time-series
 * - Snapshot Mode: Read-only, tied to simulation run, no editing allowed
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

export type BlueprintViewMode = 'designer' | 'snapshot';

/**
 * Feature flags for each mode
 * These enforce what is allowed in each context
 */
interface BlueprintModeCapabilities {
  // Editing capabilities
  canEditAgents: boolean;
  canEditKPIs: boolean;
  canEditWorkflows: boolean;
  canEditScenarios: boolean;
  canEditThresholds: boolean;
  canEditFacility: boolean;
  canEditSovereignty: boolean;
  canAddItems: boolean;
  canDeleteItems: boolean;
  canSave: boolean;
  
  // Display capabilities
  showValidationWarnings: boolean;
  showReadinessScore: boolean;
  showVersionHistory: boolean;
  showChangeLog: boolean;
  showDependencyGraph: boolean;
  
  // FORBIDDEN in Designer (Simulation-only)
  showLiveTelemetry: boolean;
  showTimeSeries: boolean;
  showHeatmaps: boolean;
  showEventTimeline: boolean;
  showSimulationControls: boolean;
  showKPIDeltas: boolean;
  showRootCauseAnalysis: boolean;
  showLiveRecommendations: boolean;
}

const DESIGNER_CAPABILITIES: BlueprintModeCapabilities = {
  // Full editing in Designer
  canEditAgents: true,
  canEditKPIs: true,
  canEditWorkflows: true,
  canEditScenarios: true,
  canEditThresholds: true,
  canEditFacility: true,
  canEditSovereignty: true,
  canAddItems: true,
  canDeleteItems: true,
  canSave: true,
  
  // Designer displays
  showValidationWarnings: true,
  showReadinessScore: true,
  showVersionHistory: true,
  showChangeLog: true,
  showDependencyGraph: true,
  
  // FORBIDDEN in Designer - these are Simulation-only
  showLiveTelemetry: false,
  showTimeSeries: false,
  showHeatmaps: false,
  showEventTimeline: false,
  showSimulationControls: false,
  showKPIDeltas: false,
  showRootCauseAnalysis: false,
  showLiveRecommendations: false,
};

const SNAPSHOT_CAPABILITIES: BlueprintModeCapabilities = {
  // NO editing in Snapshot
  canEditAgents: false,
  canEditKPIs: false,
  canEditWorkflows: false,
  canEditScenarios: false,
  canEditThresholds: false,
  canEditFacility: false,
  canEditSovereignty: false,
  canAddItems: false,
  canDeleteItems: false,
  canSave: false,
  
  // Snapshot displays (read-only views)
  showValidationWarnings: false,
  showReadinessScore: false,
  showVersionHistory: false,
  showChangeLog: false,
  showDependencyGraph: true, // Can view but not edit
  
  // Simulation-context displays allowed in Snapshot
  showLiveTelemetry: false, // Live telemetry is in Simulation, not Snapshot
  showTimeSeries: false,
  showHeatmaps: false,
  showEventTimeline: false,
  showSimulationControls: false,
  showKPIDeltas: false,
  showRootCauseAnalysis: false,
  showLiveRecommendations: false,
};

interface BlueprintViewContextValue {
  mode: BlueprintViewMode;
  readOnly: boolean;
  capabilities: BlueprintModeCapabilities;
  
  // Snapshot-specific metadata (only present when mode === 'snapshot')
  snapshotMeta?: {
    simulationRunId: string;
    blueprintVersion: string;
    capturedAt: string;
  };
  
  // Helper methods
  isDesigner: () => boolean;
  isSnapshot: () => boolean;
  canEdit: (feature: keyof BlueprintModeCapabilities) => boolean;
  canShow: (feature: keyof BlueprintModeCapabilities) => boolean;
}

const BlueprintViewContext = createContext<BlueprintViewContextValue | undefined>(undefined);

interface BlueprintViewProviderProps {
  children: ReactNode;
  mode: BlueprintViewMode;
  snapshotMeta?: {
    simulationRunId: string;
    blueprintVersion: string;
    capturedAt: string;
  };
}

export function BlueprintViewProvider({ 
  children, 
  mode, 
  snapshotMeta 
}: BlueprintViewProviderProps) {
  const value = useMemo<BlueprintViewContextValue>(() => {
    const capabilities = mode === 'designer' ? DESIGNER_CAPABILITIES : SNAPSHOT_CAPABILITIES;
    
    return {
      mode,
      readOnly: mode === 'snapshot',
      capabilities,
      snapshotMeta: mode === 'snapshot' ? snapshotMeta : undefined,
      
      isDesigner: () => mode === 'designer',
      isSnapshot: () => mode === 'snapshot',
      canEdit: (feature) => capabilities[feature] === true,
      canShow: (feature) => capabilities[feature] === true,
    };
  }, [mode, snapshotMeta]);

  return (
    <BlueprintViewContext.Provider value={value}>
      {children}
    </BlueprintViewContext.Provider>
  );
}

export function useBlueprintView(): BlueprintViewContextValue {
  const context = useContext(BlueprintViewContext);
  
  // Default to designer mode if no provider (maintains backward compatibility)
  if (context === undefined) {
    return {
      mode: 'designer',
      readOnly: false,
      capabilities: DESIGNER_CAPABILITIES,
      isDesigner: () => true,
      isSnapshot: () => false,
      canEdit: () => true,
      canShow: (feature) => DESIGNER_CAPABILITIES[feature] === true,
    };
  }
  
  return context;
}

/**
 * Hook for checking if current view is read-only
 * Convenience wrapper for common use case
 */
export function useBlueprintReadOnly(): boolean {
  const { readOnly } = useBlueprintView();
  return readOnly;
}

/**
 * Hook for getting mode capabilities
 */
export function useBlueprintCapabilities(): BlueprintModeCapabilities {
  const { capabilities } = useBlueprintView();
  return capabilities;
}

/**
 * Hook to check if a specific edit action is allowed
 */
export function useCanEdit(feature: keyof BlueprintModeCapabilities): boolean {
  const { canEdit } = useBlueprintView();
  return canEdit(feature);
}

/**
 * Hook to check if a specific display feature should be shown
 */
export function useCanShow(feature: keyof BlueprintModeCapabilities): boolean {
  const { canShow } = useBlueprintView();
  return canShow(feature);
}

// Export capabilities for external use
export { DESIGNER_CAPABILITIES, SNAPSHOT_CAPABILITIES };
export type { BlueprintModeCapabilities };

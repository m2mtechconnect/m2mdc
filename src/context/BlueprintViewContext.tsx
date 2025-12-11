/**
 * Blueprint View Context - THREE-MODE ARCHITECTURE
 * 
 * ENFORCES strict separation between:
 * 1. DESIGNER MODE - Full-screen Blueprint Designer (ONLY place for editing)
 * 2. DESIGN VIEW MODE - Read-only summary on Solution page tabs
 * 3. SIMULATION SNAPSHOT MODE - Frozen snapshot during simulation runtime
 * 
 * INDUSTRY STANDARD: Matches Google Cloud TwinMaker, AWS SimSpace Weaver, Azure Digital Twins
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

/**
 * Three distinct modes for Blueprint visualization
 */
export type BlueprintViewMode = 'designer' | 'designView' | 'simulationSnapshot';

/**
 * Feature flags for each mode - STRICT enforcement
 */
export interface BlueprintModeCapabilities {
  // Editing capabilities - ONLY enabled in Designer
  canEditAgents: boolean;
  canEditKPIs: boolean;
  canEditWorkflows: boolean;
  canEditScenarios: boolean;
  canEditThresholds: boolean;
  canEditFacility: boolean;
  canEditSovereignty: boolean;
  canEditTopology: boolean;
  canAddItems: boolean;
  canDeleteItems: boolean;
  canSave: boolean;
  
  // Designer-only displays
  showValidationWarnings: boolean;
  showReadinessScore: boolean;
  showVersionHistory: boolean;
  showChangeLog: boolean;
  showDependencyGraph: boolean;
  
  // Design View displays (read-only summary)
  showArchitectureSummary: boolean;
  showDomainOverview: boolean;
  showWorkflowPreview: boolean;
  showKPISummary: boolean;
  showDesignerCTA: boolean;
  
  // Simulation-ONLY displays (FORBIDDEN in Designer & Design View)
  showLiveTelemetry: boolean;
  showTimeSeries: boolean;
  showHeatmaps: boolean;
  showEventTimeline: boolean;
  showSimulationControls: boolean;
  showKPIDeltas: boolean;
  showRootCauseAnalysis: boolean;
  showLiveRecommendations: boolean;
  showSnapshotInfo: boolean;
}

/**
 * DESIGNER MODE - Full editing capability
 * URL: /blueprint/:id
 */
export const DESIGNER_CAPABILITIES: BlueprintModeCapabilities = {
  // Full editing in Designer
  canEditAgents: true,
  canEditKPIs: true,
  canEditWorkflows: true,
  canEditScenarios: true,
  canEditThresholds: true,
  canEditFacility: true,
  canEditSovereignty: true,
  canEditTopology: true,
  canAddItems: true,
  canDeleteItems: true,
  canSave: true,
  
  // Designer displays
  showValidationWarnings: true,
  showReadinessScore: true,
  showVersionHistory: true,
  showChangeLog: true,
  showDependencyGraph: true,
  
  // Design View displays (also shown in designer)
  showArchitectureSummary: true,
  showDomainOverview: true,
  showWorkflowPreview: true,
  showKPISummary: true,
  showDesignerCTA: false, // Already in designer
  
  // FORBIDDEN in Designer - these are Simulation-only
  showLiveTelemetry: false,
  showTimeSeries: false,
  showHeatmaps: false,
  showEventTimeline: false,
  showSimulationControls: false,
  showKPIDeltas: false,
  showRootCauseAnalysis: false,
  showLiveRecommendations: false,
  showSnapshotInfo: false,
};

/**
 * DESIGN VIEW MODE - Read-only summary on Solution page
 * Tab: "Design" (formerly "Blueprint")
 */
export const DESIGN_VIEW_CAPABILITIES: BlueprintModeCapabilities = {
  // NO editing in Design View
  canEditAgents: false,
  canEditKPIs: false,
  canEditWorkflows: false,
  canEditScenarios: false,
  canEditThresholds: false,
  canEditFacility: false,
  canEditSovereignty: false,
  canEditTopology: false,
  canAddItems: false,
  canDeleteItems: false,
  canSave: false,
  
  // No designer-specific displays
  showValidationWarnings: false,
  showReadinessScore: false,
  showVersionHistory: false,
  showChangeLog: false,
  showDependencyGraph: true, // Can view but not edit
  
  // Design View displays (read-only summary)
  showArchitectureSummary: true,
  showDomainOverview: true,
  showWorkflowPreview: true,
  showKPISummary: true,
  showDesignerCTA: true, // Show CTA to open Blueprint Designer
  
  // FORBIDDEN - Simulation-only
  showLiveTelemetry: false,
  showTimeSeries: false,
  showHeatmaps: false,
  showEventTimeline: false,
  showSimulationControls: false,
  showKPIDeltas: false,
  showRootCauseAnalysis: false,
  showLiveRecommendations: false,
  showSnapshotInfo: false,
};

/**
 * SIMULATION SNAPSHOT MODE - Frozen snapshot during runtime
 * Tab: "Simulation" with snapshot panel
 */
export const SIMULATION_SNAPSHOT_CAPABILITIES: BlueprintModeCapabilities = {
  // NO editing in Simulation
  canEditAgents: false,
  canEditKPIs: false,
  canEditWorkflows: false,
  canEditScenarios: false,
  canEditThresholds: false,
  canEditFacility: false,
  canEditSovereignty: false,
  canEditTopology: false,
  canAddItems: false,
  canDeleteItems: false,
  canSave: false,
  
  // No designer-specific displays
  showValidationWarnings: false,
  showReadinessScore: false,
  showVersionHistory: false,
  showChangeLog: false,
  showDependencyGraph: false,
  
  // Limited Design View displays
  showArchitectureSummary: false,
  showDomainOverview: false,
  showWorkflowPreview: false,
  showKPISummary: false,
  showDesignerCTA: true, // Show CTA to open Blueprint Designer
  
  // Simulation displays ENABLED
  showLiveTelemetry: true,
  showTimeSeries: true,
  showHeatmaps: true,
  showEventTimeline: true,
  showSimulationControls: true,
  showKPIDeltas: true,
  showRootCauseAnalysis: true,
  showLiveRecommendations: true,
  showSnapshotInfo: true,
};

interface BlueprintViewContextValue {
  mode: BlueprintViewMode;
  readOnly: boolean;
  capabilities: BlueprintModeCapabilities;
  
  // Snapshot metadata (only present when mode === 'simulationSnapshot')
  snapshotMeta?: {
    simulationRunId: string;
    blueprintVersion: string;
    capturedAt: string;
    scenarioName?: string;
  };
  
  // Helper methods
  isDesigner: () => boolean;
  isDesignView: () => boolean;
  isSimulationSnapshot: () => boolean;
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
    scenarioName?: string;
  };
}

export function BlueprintViewProvider({ 
  children, 
  mode, 
  snapshotMeta 
}: BlueprintViewProviderProps) {
  const value = useMemo<BlueprintViewContextValue>(() => {
    let capabilities: BlueprintModeCapabilities;
    
    switch (mode) {
      case 'designer':
        capabilities = DESIGNER_CAPABILITIES;
        break;
      case 'designView':
        capabilities = DESIGN_VIEW_CAPABILITIES;
        break;
      case 'simulationSnapshot':
        capabilities = SIMULATION_SNAPSHOT_CAPABILITIES;
        break;
      default:
        capabilities = DESIGNER_CAPABILITIES;
    }
    
    return {
      mode,
      readOnly: mode !== 'designer',
      capabilities,
      snapshotMeta: mode === 'simulationSnapshot' ? snapshotMeta : undefined,
      
      isDesigner: () => mode === 'designer',
      isDesignView: () => mode === 'designView',
      isSimulationSnapshot: () => mode === 'simulationSnapshot',
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
      isDesignView: () => false,
      isSimulationSnapshot: () => false,
      canEdit: () => true,
      canShow: (feature) => DESIGNER_CAPABILITIES[feature] === true,
    };
  }
  
  return context;
}

/**
 * Hook for checking if current view is read-only
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

// Legacy export for backward compatibility
export const SNAPSHOT_CAPABILITIES = SIMULATION_SNAPSHOT_CAPABILITIES;

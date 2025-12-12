/**
 * Simulation Components Index
 * Exports all simulation-related components
 * 
 * SIMULATION MODE ONLY - These components should never appear in Blueprint Designer
 * All components operate on frozen blueprint snapshots
 */

// Core simulation components
export { DCSimulationPanel } from './DCSimulationPanel';
export { ScenarioSimulationPanel } from './ScenarioSimulationPanel';
export { DCSimulationControls } from './DCSimulationControls';
export { DCScenarioSelector } from './DCScenarioSelector';
export { DCEventTimeline } from './DCEventTimeline';
export { DCKPIDeltas } from './DCKPIDeltas';
export { SimulationControls } from './SimulationControls';
export { SimulationPreviewModal } from './SimulationPreviewModal';
export { SimulationResultPanel } from './SimulationResultPanel';
export { SimulationChecklist } from './SimulationChecklist';
export { SimulationToolsPanel } from './SimulationToolsPanel';
export { SimulationQuickNav } from './SimulationQuickNav';
export { SimulationBlueprintSnapshotPanel } from './SimulationBlueprintSnapshotPanel';

// Mode Headers - CLEAR VISUAL SEPARATION
export { SimulationModeHeader } from './SimulationModeHeader';
export { SimulationSnapshotHeader } from './SimulationSnapshotHeader';

// Enhanced simulation components
export { EnhancedTimeControls } from './EnhancedTimeControls';
export { EnhancedSimulationControls } from './EnhancedSimulationControls';
export { EnhancedScenarioCard } from './EnhancedScenarioCard';
export { EnhancedEventLogPanel } from './EnhancedEventLogPanel';
export { EnhancedKPIChartsPanel } from './EnhancedKPIChartsPanel';
export { EnhancedKPITile } from './EnhancedKPITile';

// Animated components
export { AnimatedKPIChart } from './AnimatedKPIChart';
export { AnimatedKPIStrip } from './AnimatedKPIStrip';
export { AnimatedRackHeatmap } from './AnimatedRackHeatmap';

// Analysis and comparison
export { MultiKPIOverlay } from './MultiKPIOverlay';
export { SimulationComparisonMode } from './SimulationComparisonMode';
export { MultiRunComparison } from './MultiRunComparison';
export { LiveRecommendations } from './LiveRecommendations';
export { LiveSimulationDashboard } from './LiveSimulationDashboard';

// Context and detail components
export { ScenarioContextSidebar } from './ScenarioContextSidebar';
export { CustomScenarioBuilder } from './CustomScenarioBuilder';
export { ClickableEventTimeline } from './ClickableEventTimeline';
export { KPIDetailModal } from './KPIDetailModal';
export { AIRecommendationsPanel } from './AIRecommendationsPanel';

// Enterprise KPI System Components
export { EnterpriseKPICard, EnterpriseKPICardGrid } from './EnterpriseKPICard';
export { EnterpriseKPIChart } from './EnterpriseKPIChart';
export { KPICorrelationMatrix } from './KPICorrelationMatrix';
export { WhatIfControls } from './WhatIfControls';
export { EnhancedComparisonMode } from './EnhancedComparisonMode';
export { LiveInsightsKPIPanel } from './LiveInsightsKPIPanel';

// UI Polish Components
export {
  LiveSimulationBadge,
  KPILegend,
  EventSeverityBadge,
  TimelineEventMarker,
  SimulationProgressBar,
  SimulationTimeDisplay,
  ComparisonRow,
  ComparisonTable,
  KPI_DOMAIN_COLORS,
} from './SimulationEnvironmentPolish';

// Loading & Feedback Components
export {
  KPICardSkeleton,
  KPIGridSkeleton,
  ScenarioCardSkeleton,
  ScenarioGridSkeleton,
  ChartSkeleton,
  TimeControlsSkeleton,
  SimulationPageSkeleton,
} from './SimulationLoadingSkeleton';

export {
  showSimulationStartToast,
  showSimulationPauseToast,
  showSimulationResetToast,
  showSimulationCompleteToast,
  showScenarioSelectedToast,
  showSimulationErrorToast,
  ActionPulse,
  SimulationStatusIndicator,
  SimulationProgress,
  useSimulationFeedback,
} from './SimulationFeedback';

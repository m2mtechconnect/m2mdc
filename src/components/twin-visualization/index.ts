/**
 * Twin Visualization Components
 * Visual digital twin layer for data centre representation
 */

// Main layout component
export { TwinVisualizationLayout } from './TwinVisualizationLayout';

// Error boundary for simulation crashes
export { SimulationErrorBoundary } from './SimulationErrorBoundary';

// Core 3D components (lazy-loaded internally)
export { DataCenter3DScene } from './DataCenter3DScene';
export { Rack } from './Rack';
export { RackGroup } from './RackGroup';

// Overlay layers
export { ThermalOverlayLayer } from './ThermalOverlayLayer';
export { PowerFlowLayer } from './PowerFlowLayer';
export { NetworkTopologyLayer } from './NetworkTopologyLayer';
export { SovereigntyOverlayLayer } from './SovereigntyOverlayLayer';
export { CoolingOverlayLayer } from './CoolingOverlayLayer';
export { WorkloadOverlayLayer } from './WorkloadOverlayLayer';

// Overlay domain type
export type { OverlayDomain } from './DataCenter3DScene';

// Controls
export { ZoomControlsOverlay } from './ZoomControlsOverlay';
export type { ZoomControlsOverlayProps } from './ZoomControlsOverlay';

// Timeline component
export { SimulationTimeline } from './SimulationTimeline';

// Hooks
export { useTwinVisualizationData } from './hooks/useTwinVisualizationData';

// Types
export type {
  RackVisual,
  RowVisual,
  PowerSegmentVisual,
  ThermalZoneVisual,
  NetworkNodeVisual,
  NetworkLinkVisual,
  SimulationEventVisual,
  TwinVisualizationMode,
  TwinVisualizationState
} from './types';

export {
  THERMAL_COLORS,
  UTILIZATION_COLORS,
  POWER_COLORS,
  getThermalColor,
  getUtilizationColor,
  getPowerColor
} from './types';

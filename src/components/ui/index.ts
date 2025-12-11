/**
 * UI Components Index
 * Exports all shared UI components for easy importing
 */

// Empty States
export {
  EmptyState,
  ScannerEmptyState,
  NoDataEmptyState,
  NoTwinSelectedEmptyState,
  NoSimulationHistoryEmptyState,
  NoAgentsEmptyState,
  ErrorEmptyState,
  LoadingState,
  SnapshotNotFoundEmptyState,
} from './empty-state';

// Status Badges
export { StatusBadge, type StatusType } from './status-badge';

// Snapshot Indicators
export {
  SnapshotBadge,
  ChangeIndicator,
  ModeBadge,
  LastUpdatedBadge,
  BuilderStateIndicator,
  SnapshotHeader,
} from './snapshot-indicator';

// KPI Tooltips
export { KpiTooltip, KPI_TOOLTIPS, getKpiTooltipProps } from './kpi-tooltip';

// Re-export common shadcn components for convenience
export { Badge } from './badge';
export { Button } from './button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

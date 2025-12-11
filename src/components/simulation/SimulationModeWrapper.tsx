/**
 * Simulation Mode Wrapper
 * Contains ALL simulation-specific components that are FORBIDDEN in Blueprint Designer
 * 
 * These components show:
 * - Live telemetry
 * - Time-series data
 * - Heatmaps
 * - Event timelines
 * - Simulation controls
 * - KPI deltas
 * - Root cause analysis
 * - Live recommendations
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Thermometer, 
  LineChart, 
  Clock, 
  Flame,
  Zap,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimulationOnlyWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper to clearly mark simulation-only content
 * Use this to wrap components that should NEVER appear in Blueprint Designer
 */
export function SimulationOnlyWrapper({ children, className }: SimulationOnlyWrapperProps) {
  return (
    <div className={cn('simulation-only', className)}>
      {children}
    </div>
  );
}

/**
 * Components that are EXCLUSIVELY for Simulation mode
 * These are exported here for documentation and import convenience
 */

// Re-export simulation components
export { DCSimulationPanel } from '@/components/simulation/DCSimulationPanel';
export { DCSimulationControls } from '@/components/simulation/DCSimulationControls';
export { DCEventTimeline } from '@/components/simulation/DCEventTimeline';
export { DCKPIDeltas } from '@/components/simulation/DCKPIDeltas';
export { DCScenarioSelector } from '@/components/simulation/DCScenarioSelector';
export { CustomScenarioBuilder } from '@/components/simulation/CustomScenarioBuilder';
export { AnimatedKPIChart, AnimatedKPIChartGrid } from '@/components/simulation/AnimatedKPIChart';
export { AnimatedRackHeatmap } from '@/components/simulation/AnimatedRackHeatmap';
export { SimulationResultPanel } from '@/components/simulation/SimulationResultPanel';
export { LiveRecommendations } from '@/components/simulation/LiveRecommendations';
export { MultiKPIOverlay } from '@/components/simulation/MultiKPIOverlay';
export { SimulationComparisonMode } from '@/components/simulation/SimulationComparisonMode';
export { EnhancedTimeControls } from '@/components/simulation/EnhancedTimeControls';
export { EnhancedSimulationControls } from '@/components/simulation/EnhancedSimulationControls';

/**
 * Features available ONLY in Simulation mode
 */
export const SIMULATION_ONLY_FEATURES = [
  'Live Telemetry',
  'Time-Series Charts',
  'Thermal Heatmaps',
  'Event Timeline',
  'Simulation Controls',
  'KPI Deltas',
  'Root Cause Analysis',
  'Live Recommendations',
  'Scenario Execution',
  'Run Comparison',
  'Checkpoint/Resume',
  'What-If Analysis',
] as const;

/**
 * Features available ONLY in Blueprint Designer mode
 */
export const DESIGNER_ONLY_FEATURES = [
  'Edit Agents',
  'Edit KPIs',
  'Edit Workflows', 
  'Edit Scenarios',
  'Edit Thresholds',
  'Edit Facility Config',
  'Edit Sovereignty Settings',
  'Add/Delete Items',
  'Validation Warnings',
  'Readiness Score',
  'Version History',
  'Change Log Editing',
  'Save Blueprint',
] as const;

/**
 * Mode indicator badge
 */
export function SimulationModeBadge() {
  return (
    <Badge variant="default" className="bg-orange-500/90 text-white gap-1">
      <Activity className="h-3 w-3" />
      Simulation Mode
    </Badge>
  );
}

export function DesignerModeBadge() {
  return (
    <Badge variant="default" className="bg-blue-500/90 text-white gap-1">
      <Activity className="h-3 w-3" />
      Designer Mode
    </Badge>
  );
}

/**
 * Simulation Feature Cards - War Room Layout
 */
export function SimulationWarRoomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="simulation-war-room grid grid-cols-12 gap-4">
      {children}
    </div>
  );
}

/**
 * Live Telemetry Panel - Simulation Only
 */
interface LiveTelemetryPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LiveTelemetryPanel({ title, icon, children, className }: LiveTelemetryPanelProps) {
  return (
    <Card className={cn('border-orange-500/20', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon || <Activity className="h-4 w-4 text-orange-500" />}
          {title}
          <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
            LIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Thermal Heatmap Wrapper - Simulation Only
 */
export function ThermalHeatmapWrapper({ children }: { children: ReactNode }) {
  return (
    <LiveTelemetryPanel 
      title="Thermal Heatmap" 
      icon={<Thermometer className="h-4 w-4 text-red-500" />}
    >
      {children}
    </LiveTelemetryPanel>
  );
}

/**
 * Time Series Wrapper - Simulation Only  
 */
export function TimeSeriesWrapper({ children, title = 'Time Series' }: { children: ReactNode; title?: string }) {
  return (
    <LiveTelemetryPanel 
      title={title} 
      icon={<LineChart className="h-4 w-4 text-blue-500" />}
    >
      {children}
    </LiveTelemetryPanel>
  );
}

/**
 * Event Timeline Wrapper - Simulation Only
 */
export function EventTimelineWrapper({ children }: { children: ReactNode }) {
  return (
    <LiveTelemetryPanel 
      title="Event Timeline" 
      icon={<Clock className="h-4 w-4 text-purple-500" />}
    >
      {children}
    </LiveTelemetryPanel>
  );
}

/**
 * Incident Cards - Simulation Only
 */
interface IncidentCardProps {
  title: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  timestamp: string;
  description: string;
  domain: string;
}

export function IncidentCard({ title, severity, timestamp, description, domain }: IncidentCardProps) {
  const severityColors = {
    info: 'border-l-info bg-info/5',
    warning: 'border-l-warning bg-warning/5',
    critical: 'border-l-destructive bg-destructive/5',
    emergency: 'border-l-red-600 bg-red-600/5',
  };
  
  return (
    <Card className={cn('border-l-4', severityColors[severity])}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn(
                'h-4 w-4',
                severity === 'emergency' || severity === 'critical' ? 'text-destructive' :
                severity === 'warning' ? 'text-warning' : 'text-info'
              )} />
              <span className="font-medium text-sm">{title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-[10px]">{domain}</Badge>
            <p className="text-[10px] text-muted-foreground mt-1">{timestamp}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Root Cause Analysis Panel - Simulation Only
 */
interface RootCauseAnalysisPanelProps {
  analysis: string;
  confidence: number;
  recommendations: string[];
}

export function RootCauseAnalysisPanel({ analysis, confidence, recommendations }: RootCauseAnalysisPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Root Cause Analysis
          <Badge variant="outline" className="text-[10px]">
            {confidence}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{analysis}</p>
        <div>
          <div className="text-xs font-medium mb-2 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Recommendations
          </div>
          <div className="space-y-1">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

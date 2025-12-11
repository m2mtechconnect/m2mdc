/**
 * Simulation Environment UI Polish Components
 * Live badges, enhanced timeline, KPI legends, and event markers
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  Play, Pause, Square, Activity, Clock, Zap, 
  Thermometer, Droplets, Shield, DollarSign, Server,
  AlertTriangle, CheckCircle2, XCircle, Info
} from "lucide-react";

// === Live Simulation Badge ===
interface LiveSimulationBadgeProps {
  isRunning: boolean;
  isPaused?: boolean;
  className?: string;
}

export function LiveSimulationBadge({ isRunning, isPaused, className }: LiveSimulationBadgeProps) {
  if (!isRunning && !isPaused) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Square className="h-3 w-3 mr-1" />
        Stopped
      </Badge>
    );
  }

  if (isPaused) {
    return (
      <Badge variant="secondary" className={cn("text-xs", className)}>
        <Pause className="h-3 w-3 mr-1" />
        Paused
      </Badge>
    );
  }

  return (
    <Badge className={cn("text-xs bg-success text-success-foreground animate-pulse", className)}>
      <Activity className="h-3 w-3 mr-1" />
      Live Simulation
    </Badge>
  );
}

// === KPI Domain Colors ===
export const KPI_DOMAIN_COLORS: Record<string, { color: string; icon: typeof Zap; label: string }> = {
  thermal: { color: 'hsl(var(--warning))', icon: Thermometer, label: 'Thermal' },
  power: { color: 'hsl(var(--destructive))', icon: Zap, label: 'Power' },
  cooling: { color: 'hsl(var(--info))', icon: Droplets, label: 'Cooling' },
  sovereignty: { color: 'hsl(var(--primary))', icon: Shield, label: 'Sovereignty' },
  financial: { color: 'hsl(var(--success))', icon: DollarSign, label: 'Financial' },
  workload: { color: 'hsl(var(--accent))', icon: Server, label: 'Workload' },
};

// === KPI Legend ===
interface KPILegendProps {
  activeDomains: string[];
  className?: string;
}

export function KPILegend({ activeDomains, className }: KPILegendProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activeDomains.map(domain => {
        const config = KPI_DOMAIN_COLORS[domain];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <div 
            key={domain}
            className="flex items-center gap-1.5 text-xs"
          >
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <Icon className="h-3 w-3" style={{ color: config.color }} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// === Event Severity Badge ===
interface EventSeverityBadgeProps {
  severity: 'info' | 'warning' | 'critical' | 'success';
  className?: string;
}

export function EventSeverityBadge({ severity, className }: EventSeverityBadgeProps) {
  const config = {
    info: { icon: Info, label: 'Info', variant: 'secondary' as const },
    warning: { icon: AlertTriangle, label: 'Warning', variant: 'outline' as const },
    critical: { icon: XCircle, label: 'Critical', variant: 'destructive' as const },
    success: { icon: CheckCircle2, label: 'Resolved', variant: 'outline' as const },
  };

  const { icon: Icon, label, variant } = config[severity];

  return (
    <Badge 
      variant={variant} 
      className={cn(
        "text-xs",
        severity === 'warning' && "border-warning/50 text-warning",
        severity === 'success' && "border-success/50 text-success",
        className
      )}
    >
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

// === Timeline Event Marker ===
interface TimelineEventMarkerProps {
  event: {
    id: string;
    timestamp: number;
    severity: 'info' | 'warning' | 'critical' | 'success';
    title: string;
    domain: string;
  };
  position: number; // 0-100 percentage
  onClick?: (eventId: string) => void;
  className?: string;
}

export function TimelineEventMarker({ event, position, onClick, className }: TimelineEventMarkerProps) {
  const severityColors = {
    info: 'bg-muted-foreground',
    warning: 'bg-warning',
    critical: 'bg-destructive',
    success: 'bg-success',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick?.(event.id)}
          className={cn(
            "absolute top-0 w-2 h-full flex items-center justify-center group",
            className
          )}
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          <div className={cn(
            "w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-150",
            severityColors[event.severity]
          )} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <EventSeverityBadge severity={event.severity} />
            <Badge variant="outline" className="text-xs">{event.domain}</Badge>
          </div>
          <p className="text-sm font-medium">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// === Simulation Progress Bar with Events ===
interface SimulationProgressBarProps {
  progress: number; // 0-100
  events?: Array<{
    id: string;
    timestamp: number;
    severity: 'info' | 'warning' | 'critical' | 'success';
    title: string;
    domain: string;
    position: number;
  }>;
  onEventClick?: (eventId: string) => void;
  className?: string;
}

export function SimulationProgressBar({ 
  progress, 
  events = [], 
  onEventClick,
  className 
}: SimulationProgressBarProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Background track */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        {/* Progress fill */}
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Event markers */}
      <div className="absolute inset-0">
        {events.map(event => (
          <TimelineEventMarker
            key={event.id}
            event={event}
            position={event.position}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

// === Simulation Time Display ===
interface SimulationTimeDisplayProps {
  currentTime: number; // seconds
  totalTime: number; // seconds
  speed: number;
  className?: string;
}

export function SimulationTimeDisplay({ 
  currentTime, 
  totalTime, 
  speed,
  className 
}: SimulationTimeDisplayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono">{formatTime(currentTime)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-muted-foreground">{formatTime(totalTime)}</span>
      </div>
      <Badge variant="outline" className="text-xs font-mono">
        {speed}x
      </Badge>
    </div>
  );
}

// === Comparison Table Styling ===
interface ComparisonRowProps {
  label: string;
  valueA: string | number;
  valueB: string | number;
  unit?: string;
  higherIsBetter?: boolean;
  className?: string;
}

export function ComparisonRow({ 
  label, 
  valueA, 
  valueB, 
  unit,
  higherIsBetter = true,
  className 
}: ComparisonRowProps) {
  const numA = typeof valueA === 'number' ? valueA : parseFloat(String(valueA)) || 0;
  const numB = typeof valueB === 'number' ? valueB : parseFloat(String(valueB)) || 0;
  
  const diff = numB - numA;
  const isImprovement = higherIsBetter ? diff > 0 : diff < 0;
  const isWorse = higherIsBetter ? diff < 0 : diff > 0;

  return (
    <div className={cn("grid grid-cols-4 gap-4 py-2 border-b border-border/50 last:border-0", className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-center">
        {valueA}{unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </div>
      <div className="text-sm font-medium text-center">
        {valueB}{unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </div>
      <div className={cn(
        "text-sm font-medium text-right",
        isImprovement && "text-success",
        isWorse && "text-destructive",
        !isImprovement && !isWorse && "text-muted-foreground"
      )}>
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
      </div>
    </div>
  );
}

// === Comparison Table Card ===
interface ComparisonTableProps {
  title: string;
  labelA: string;
  labelB: string;
  rows: Array<{
    label: string;
    valueA: string | number;
    valueB: string | number;
    unit?: string;
    higherIsBetter?: boolean;
  }>;
  className?: string;
}

export function ComparisonTable({ title, labelA, labelB, rows, className }: ComparisonTableProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 py-2 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
          <div>Metric</div>
          <div className="text-center">{labelA}</div>
          <div className="text-center">{labelB}</div>
          <div className="text-right">Δ</div>
        </div>
        {/* Rows */}
        {rows.map((row, i) => (
          <ComparisonRow key={i} {...row} />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Snapshot & Change Indicators
 * Shows blueprint version, modification state, and last updated timestamps
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, GitBranch, Pencil, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface SnapshotBadgeProps {
  version: string;
  className?: string;
}

export function SnapshotBadge({ version, className }: SnapshotBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn("font-mono text-xs bg-muted/50", className)}
    >
      <GitBranch className="h-3 w-3 mr-1" />
      Snapshot {version}
    </Badge>
  );
}

interface ChangeIndicatorProps {
  changesCount: number;
  className?: string;
}

export function ChangeIndicator({ changesCount, className }: ChangeIndicatorProps) {
  if (changesCount === 0) {
    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs text-success border-success/30", className)}
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        No changes
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs text-warning border-warning/30", className)}
    >
      <Pencil className="h-3 w-3 mr-1" />
      {changesCount} field{changesCount !== 1 ? 's' : ''} modified
    </Badge>
  );
}

interface ModeBadgeProps {
  mode: 'designer' | 'snapshot' | 'simulation';
  className?: string;
}

export function ModeBadge({ mode, className }: ModeBadgeProps) {
  const config = {
    designer: {
      label: 'Blueprint Designer',
      icon: Pencil,
      variant: 'default' as const,
    },
    snapshot: {
      label: 'Snapshot Mode',
      icon: Eye,
      variant: 'secondary' as const,
    },
    simulation: {
      label: 'Simulation Environment',
      icon: GitBranch,
      variant: 'outline' as const,
    },
  };

  const { label, icon: Icon, variant } = config[mode];

  return (
    <Badge variant={variant} className={cn("text-xs", className)}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

interface LastUpdatedBadgeProps {
  timestamp: string | Date | null;
  prefix?: string;
  className?: string;
}

export function LastUpdatedBadge({ timestamp, prefix = 'Updated', className }: LastUpdatedBadgeProps) {
  if (!timestamp) return null;

  const relativeTime = formatRelativeTime(timestamp);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn("text-xs text-muted-foreground font-normal cursor-help", className)}
        >
          <Clock className="h-3 w-3 mr-1" />
          {prefix}: {relativeTime}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {new Date(timestamp).toLocaleString()}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface BuilderStateIndicatorProps {
  isDirty: boolean;
  lastUpdated: string | Date | null;
  className?: string;
}

export function BuilderStateIndicator({ isDirty, lastUpdated, className }: BuilderStateIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isDirty ? (
        <Badge variant="outline" className="text-xs text-warning border-warning/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Unsaved changes
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Saved
        </Badge>
      )}
      {lastUpdated && (
        <LastUpdatedBadge timestamp={lastUpdated} prefix="Last saved" />
      )}
    </div>
  );
}

interface SnapshotHeaderProps {
  version: string;
  mode: 'designer' | 'snapshot' | 'simulation';
  changesCount?: number;
  lastUpdated?: string | Date | null;
  className?: string;
}

export function SnapshotHeader({ 
  version, 
  mode, 
  changesCount = 0, 
  lastUpdated,
  className 
}: SnapshotHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ModeBadge mode={mode} />
      <SnapshotBadge version={version} />
      {mode === 'designer' && <ChangeIndicator changesCount={changesCount} />}
      {lastUpdated && <LastUpdatedBadge timestamp={lastUpdated} />}
    </div>
  );
}

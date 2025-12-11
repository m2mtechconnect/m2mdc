/**
 * Empty State Component
 * Unified empty state display for all modules
 */

import { ReactNode } from "react";
import { LucideIcon, Search, Database, Server, FileQuestion, AlertCircle, Loader2, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
  variant?: "card" | "inline" | "minimal";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  variant = "inline",
}: EmptyStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      variant === "minimal" ? "py-8" : "py-12",
      className
    )}>
      <div className={cn(
        "rounded-full bg-muted flex items-center justify-center mb-4",
        variant === "minimal" ? "h-12 w-12" : "h-16 w-16"
      )}>
        <Icon className={cn(
          "text-muted-foreground",
          variant === "minimal" ? "h-6 w-6" : "h-8 w-8"
        )} />
      </div>
      
      <h3 className={cn(
        "font-semibold text-foreground mb-2",
        variant === "minimal" ? "text-sm" : "text-lg"
      )}>
        {title}
      </h3>
      
      <p className={cn(
        "text-muted-foreground max-w-md",
        variant === "minimal" ? "text-xs mb-4" : "text-sm mb-6"
      )}>
        {description}
      </p>
      
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              size={variant === "minimal" ? "sm" : "default"}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size={variant === "minimal" ? "sm" : "default"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}

// Preset empty states for common scenarios
export function ScannerEmptyState({ onScan }: { onScan?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No scans yet"
      description="Enter a website URL to analyze and generate a Green Data Centre Twin recommendation."
      action={onScan ? { label: "Start Scanning", onClick: onScan } : undefined}
    />
  );
}

export function NoDataEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon={Database}
      title="No data available"
      description="Data will appear here once connected sources begin streaming telemetry."
      action={onRefresh ? { label: "Refresh", onClick: onRefresh, variant: "outline" } : undefined}
    />
  );
}

export function NoTwinSelectedEmptyState({ onSelect }: { onSelect?: () => void }) {
  return (
    <EmptyState
      icon={Server}
      title="No Data Centre selected"
      description="Select a Data Centre from the header dropdown to view dashboards and run simulations."
      action={onSelect ? { label: "Select Twin", onClick: onSelect } : undefined}
    />
  );
}

export function NoSimulationHistoryEmptyState({ onRun }: { onRun?: () => void }) {
  return (
    <EmptyState
      icon={RefreshCw}
      title="No simulation history"
      description="Run a simulation to see historical results and comparisons here."
      action={onRun ? { label: "Run Simulation", onClick: onRun } : undefined}
    />
  );
}

export function NoAgentsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Server}
      title="No agents configured"
      description="Add agents to monitor domains and automate operational responses."
      action={onCreate ? { label: "Add Agent", onClick: onCreate } : undefined}
    />
  );
}

export function ErrorEmptyState({ 
  message, 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || "Unable to load data. Please try again."}
      action={onRetry ? { label: "Retry", onClick: onRetry, variant: "outline" } : undefined}
    />
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">
        {message || "Loading..."}
      </p>
    </div>
  );
}

export function SnapshotNotFoundEmptyState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Snapshot not found"
      description="The requested simulation snapshot could not be found. It may have been deleted or the link is invalid."
      action={onGoBack ? { label: "Go Back", onClick: onGoBack, variant: "outline" } : undefined}
    />
  );
}

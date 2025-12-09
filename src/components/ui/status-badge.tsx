import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Clock, XCircle, Radio, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'error'
  | 'success'
  | 'failed'
  | 'running'
  | 'completed'
  | 'connected'
  | 'disconnected'
  | 'available'
  | 'disabled'
  | 'queued'
  | 'ingesting'
  | 'indexed'
  | 'processing'
  | 'deployed'
  | 'draft'
  | 'archived'
  | 'dead-letter';

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success";
  icon?: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  // Success states
  active: {
    label: "Active",
    variant: "success",
    icon: CheckCircle2,
  },
  success: {
    label: "Success",
    variant: "success",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    variant: "success",
    icon: CheckCircle2,
  },
  connected: {
    label: "Connected",
    variant: "success",
    icon: CheckCircle2,
  },
  indexed: {
    label: "Indexed",
    variant: "success",
    icon: CheckCircle2,
  },
  deployed: {
    label: "Deployed",
    variant: "success",
    icon: CheckCircle2,
  },

  // Error states
  error: {
    label: "Error",
    variant: "destructive",
    icon: AlertCircle,
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: XCircle,
  },
  disconnected: {
    label: "Disconnected",
    variant: "destructive",
    icon: XCircle,
  },
  'dead-letter': {
    label: "Dead Letter",
    variant: "destructive",
    icon: AlertCircle,
  },

  // In-progress states
  pending: {
    label: "Pending",
    variant: "outline",
    icon: Clock,
  },
  running: {
    label: "Running",
    variant: "secondary",
    icon: Loader2,
  },
  processing: {
    label: "Processing",
    variant: "secondary",
    icon: Loader2,
  },
  ingesting: {
    label: "Ingesting",
    variant: "secondary",
    icon: Loader2,
  },
  queued: {
    label: "Queued",
    variant: "outline",
    icon: Clock,
  },

  // Neutral states
  inactive: {
    label: "Inactive",
    variant: "outline",
    icon: CircleDot,
  },
  disabled: {
    label: "Disabled",
    variant: "secondary",
    icon: Radio,
  },
  available: {
    label: "Available",
    variant: "secondary",
  },
  draft: {
    label: "Draft",
    variant: "outline",
  },
  archived: {
    label: "Archived",
    variant: "outline",
  },
};

interface StatusBadgeProps {
  status: StatusType | string;
  showIcon?: boolean;
  customLabel?: string;
  className?: string;
}

export function StatusBadge({ 
  status, 
  showIcon = true, 
  customLabel,
  className 
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as StatusType;
  const config = STATUS_CONFIG[normalizedStatus] || {
    label: status,
    variant: "outline" as const,
  };

  const Icon = config.icon;
  const isAnimated = normalizedStatus === 'running' || 
                     normalizedStatus === 'processing' || 
                     normalizedStatus === 'ingesting';

  return (
    <Badge 
      variant={config.variant}
      className={cn("gap-1", className)}
    >
      {showIcon && Icon && (
        <Icon 
          className={cn(
            "h-3 w-3",
            isAnimated && "animate-spin"
          )} 
        />
      )}
      {customLabel || config.label}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 'active' | 'inactive' | 'error' | 'warning' | 'success' | 'draft' | 'paused';

interface StatusPillProps {
  status: StatusType | string;
  className?: string;
}

export default function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toLowerCase();
  
  // Semantic, AA-contrast pills. Never `text-secondary` (near-white on light canvas)
  // and never gray-400 on a light gray fill.
  const variants: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/30',
    success: 'bg-success/10 text-success border-success/30',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    draft: 'bg-muted text-muted-foreground border-border',
    paused: 'bg-muted text-muted-foreground border-border',
    inactive: 'bg-muted text-muted-foreground border-border',
  };


  return (
    <Badge className={cn(variants[normalized] || variants.draft, className)}>
      {status}
    </Badge>
  );
}

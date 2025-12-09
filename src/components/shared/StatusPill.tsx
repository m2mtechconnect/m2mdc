import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 'active' | 'inactive' | 'error' | 'warning' | 'success' | 'draft' | 'paused';

interface StatusPillProps {
  status: StatusType | string;
  className?: string;
}

export default function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toLowerCase();
  
  const variants: Record<string, string> = {
    active: 'bg-secondary/10 text-secondary border-secondary/30',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    paused: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <Badge className={cn(variants[normalized] || variants.draft, className)}>
      {status}
    </Badge>
  );
}

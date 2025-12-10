import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  loading?: boolean;
  className?: string;
  subtext?: string;
  tooltip?: string;
  onClick?: () => void;
}

export default function KpiCard({
  label,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  loading = false,
  className,
  subtext,
  tooltip,
  onClick,
}: KpiCardProps) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-studio-muted';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  const cardContent = (
    <Card 
      className={cn(
        "p-6 bg-secondary/5 border-secondary/10 transition-all group relative",
        onClick && "cursor-pointer hover:shadow-lg hover:border-secondary/30 hover:-translate-y-0.5 hover:bg-secondary/10",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-2.5 rounded-lg bg-secondary/10 transition-colors",
          onClick && "group-hover:bg-secondary/20"
        )}>
          <Icon className={cn(
            "h-5 w-5 text-primary transition-transform",
            onClick && "group-hover:scale-110"
          )} />
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-studio-muted" />
        ) : change ? (
          <span className={cn("flex items-center gap-1 text-xs font-mono", trendColor)}>
            {TrendIcon && <TrendIcon className="h-3 w-3" />}
            {change}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-sm text-studio-muted mb-2 flex items-center gap-2">
          {label}
          {onClick && (
            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-studio-muted" />
          )}
        </p>
        <p className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontSize: 'clamp(28px, 5vw, 36px)' }}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-studio-subtle mt-1">{subtext}</p>
        )}
      </div>
      {onClick && !tooltip && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-studio-muted" />
        </div>
      )}
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

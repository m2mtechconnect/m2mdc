import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/**
 * KPI metric-basis metadata.
 *
 * Per Lucas's Telemetry & Analytics feedback, every KPI on the dashboard
 * must declare its grain, time window, aggregation logic, and target so
 * users do not read the same number in different ways. These props are
 * additive and backward-compatible with all existing call sites.
 */
export type KpiGrain =
  | 'Facility'
  | 'Zone'
  | 'Event'
  | 'Workload'
  | 'Cluster'
  | 'Policy'
  | 'Service'
  | 'Grid Region'
  | 'Region';

export type KpiQuality = 'good' | 'suspect' | 'stale' | 'unknown';
export type KpiStatus = 'good' | 'warning' | 'critical' | 'neutral';

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
  to?: string;
  /** Metric-basis metadata (Lucas feedback) */
  unit?: string;
  grain?: KpiGrain;
  window?: string;
  aggregation?: string;
  source?: string;
  formula?: string;
  status?: KpiStatus;
  statusLabel?: string;
  quality?: KpiQuality;
  /** Optional badge displayed next to the value (e.g. grid region) */
  badge?: string;
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
  to,
  unit,
  grain,
  window,
  aggregation,
  source,
  formula,
  status,
  statusLabel,
  quality,
  badge,
}: KpiCardProps) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-studio-muted';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;
  const isInteractive = Boolean(to || onClick);

  const statusColor: Record<KpiStatus, string> = {
    good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    neutral: 'bg-muted text-muted-foreground border-border',
  };

  const qualityColor: Record<KpiQuality, string> = {
    good: 'bg-emerald-500',
    suspect: 'bg-amber-500',
    stale: 'bg-orange-500',
    unknown: 'bg-muted-foreground',
  };

  const basisParts = [grain, window, aggregation].filter(Boolean) as string[];

  const cardContent = (
    <Card 
      className={cn(
        "p-6 bg-secondary/5 border-secondary/10 transition-all group relative",
        isInteractive && "cursor-pointer hover:shadow-lg hover:border-secondary/30 hover:-translate-y-0.5 hover:bg-secondary/10",
        className
      )}
      onClick={to ? undefined : onClick}
      role={!to && onClick ? "button" : undefined}
      tabIndex={!to && onClick ? 0 : undefined}
      onKeyDown={!to && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-2.5 rounded-lg bg-secondary/10 transition-colors",
          isInteractive && "group-hover:bg-secondary/20"
        )}>
          <Icon className={cn(
            "h-5 w-5 text-primary transition-transform",
            isInteractive && "group-hover:scale-110"
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
          {quality && (
            <span
              className={cn('inline-block w-1.5 h-1.5 rounded-full', qualityColor[quality])}
              aria-label={`Data quality: ${quality}`}
              title={`Data quality: ${quality}`}
            />
          )}
          {isInteractive && (
            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-studio-muted" />
          )}
        </p>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <p className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontSize: 'clamp(28px, 5vw, 36px)' }}>
            {value}
          </p>
          {unit && (
            <span className="text-sm font-medium text-muted-foreground">{unit}</span>
          )}
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent-foreground border border-accent/30">
              {badge}
            </span>
          )}
        </div>
        {basisParts.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
            {basisParts.join(' \u00b7 ')}
          </p>
        )}
        {(status || statusLabel) && (
          <div className="mt-2">
            <span
              className={cn(
                'inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border',
                statusColor[status ?? 'neutral']
              )}
            >
              {statusLabel ?? status}
            </span>
          </div>
        )}
        {subtext && (
          <p className="text-xs text-studio-subtle mt-1">{subtext}</p>
        )}
      </div>
      {isInteractive && !tooltip && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-studio-muted" />
        </div>
      )}
    </Card>
  );

  const tooltipBody = tooltip || formula || source ? (
    <div className="space-y-1.5">
      {tooltip && <p className="text-sm">{tooltip}</p>}
      {formula && (
        <p className="text-xs">
          <span className="font-semibold">Formula:</span>{' '}
          <code className="font-mono">{formula}</code>
        </p>
      )}
      {source && (
        <p className="text-xs">
          <span className="font-semibold">Source:</span> {source}
        </p>
      )}
    </div>
  ) : null;

  const interactiveContent = to ? (
    <Link
      to={to}
      className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {cardContent}
    </Link>
  ) : cardContent;

  if (tooltipBody) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {interactiveContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipBody}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return interactiveContent;
}

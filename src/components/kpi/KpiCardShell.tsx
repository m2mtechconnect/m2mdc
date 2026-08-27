/**
 * Shared KPI card shell.
 *
 * The audit found four independent KPI card implementations that each
 * re-created the same presentation surface: the card frame and its
 * interaction affordances, the value/unit pairing, the trend chip, the status
 * badge and the data-quality dot.
 *
 * This module owns that presentation layer so every KPI surface renders the
 * same primitives. It deliberately does NOT own the prop contracts or the
 * drill-down behaviour of the individual cards: each card keeps its own
 * exported props, its own data shape and its own drill-down (link navigation,
 * dialog, overlay click) and composes these primitives inside.
 *
 * Presentation only. It never infers provenance, liveness or measurement
 * truth, and it uses semantic design tokens exclusively.
 */

import { forwardRef, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  KPI_QUALITY_DOT_CLASS,
  KPI_SEVERITY_BADGE,
  KPI_STATUS_BADGE_CLASS,
  KPI_TREND_TEXT_CLASS,
  type KpiQualityTone,
  type KpiSeverity,
  type KpiStatusTone,
  type KpiTrendTone,
} from './kpiSemantics';

/** Icon set for a trend tone. `arrow` reads as navigation, `trending` as telemetry. */
export function kpiTrendIcon(tone: KpiTrendTone, style: 'arrow' | 'trending' = 'trending'): LucideIcon {
  if (tone === 'flat') return Minus;
  if (style === 'arrow') return tone === 'improving' ? ArrowUpRight : ArrowDownRight;
  return tone === 'improving' ? TrendingUp : TrendingDown;
}

export interface KpiCardSurfaceProps {
  children: ReactNode;
  className?: string;
  /**
   * Drill-down activation. Ownership of what the drill-down does stays with
   * the calling card; the surface only supplies the affordance, the pointer
   * role and keyboard parity.
   */
  onActivate?: () => void;
  /** Render a plain div instead of a Card (compact rows, animated wrappers). */
  as?: 'card' | 'div';
  testId?: string;
  /** Extra data-* attributes (e.g. data-provenance) owned by the caller. */
  dataAttributes?: Record<string, string | undefined>;
  ariaLabel?: string;
}

/** Card frame plus interaction affordances shared by every KPI card. */
export const KpiCardSurface = forwardRef<HTMLDivElement, KpiCardSurfaceProps>(function KpiCardSurface({
  children,
  className,
  onActivate,
  as = 'card',
  testId,
  dataAttributes,
  ariaLabel,
}: KpiCardSurfaceProps, ref) {
  const interactive = Boolean(onActivate);
  const handleKeyDown = interactive
    ? (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate?.();
        }
      }
    : undefined;

  const shared = {
    onClick: onActivate,
    onKeyDown: handleKeyDown,
    role: interactive ? 'button' : undefined,
    tabIndex: interactive ? 0 : undefined,
    'aria-label': ariaLabel,
    'data-testid': testId,
    ...(dataAttributes ?? {}),
  };

  const interactionClass = interactive
    ? 'cursor-pointer transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
    : undefined;

  if (as === 'div') {
    return (
      <div ref={ref} className={cn('group relative', interactionClass, className)} {...shared}>
        {children}
      </div>
    );
  }

  return (
    <Card ref={ref} className={cn('group relative', interactionClass, className)} {...shared}>
      {children}
    </Card>
  );
});

KpiCardSurface.displayName = 'KpiCardSurface';

export interface KpiValueProps {
  value: string | number;
  unit?: string;
  badge?: ReactNode;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
}

/** Value/unit pairing with an optional inline badge slot. */
export function KpiValue({ value, unit, badge, className, valueClassName, unitClassName }: KpiValueProps) {
  return (
    <div className={cn('flex items-baseline gap-1.5 flex-wrap min-w-0', className)}>
      <span className={cn('text-2xl font-bold text-foreground', valueClassName)}>{value}</span>
      {unit && <span className={cn('text-sm text-muted-foreground', unitClassName)}>{unit}</span>}
      {badge}
    </div>
  );
}

export interface KpiTrendChipProps {
  tone: KpiTrendTone;
  label: ReactNode;
  iconStyle?: 'arrow' | 'trending';
  showIcon?: boolean;
  className?: string;
  iconClassName?: string;
}

/** Directional change indicator. Tone colour always comes from the semantics module. */
export function KpiTrendChip({
  tone,
  label,
  iconStyle = 'trending',
  showIcon = true,
  className,
  iconClassName,
}: KpiTrendChipProps) {
  const Icon = kpiTrendIcon(tone, iconStyle);
  return (
    <span className={cn('flex items-center gap-1 text-xs font-mono', KPI_TREND_TEXT_CLASS[tone], className)}>
      {showIcon && <Icon className={cn('h-3 w-3', iconClassName)} />}
      {label}
    </span>
  );
}

export interface KpiStatusBadgeProps {
  /** Dashboard vocabulary. */
  status?: KpiStatusTone;
  /** DC twin vocabulary; supplies a default label when none is given. */
  severity?: KpiSeverity;
  label?: ReactNode;
  className?: string;
}

/** Status chip shared by the dashboard and DC twin vocabularies. */
export function KpiStatusBadge({ status, severity, label, className }: KpiStatusBadgeProps) {
  const resolved = severity
    ? KPI_SEVERITY_BADGE[severity]
    : { label: String(status ?? 'neutral'), className: KPI_STATUS_BADGE_CLASS[status ?? 'neutral'] };
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border',
        resolved.className,
        className,
      )}
    >
      {label ?? resolved.label}
    </span>
  );
}

/** Data-quality dot. Quality describes the reading, never the value. */
export function KpiQualityDot({ quality, className }: { quality: KpiQualityTone; className?: string }) {
  return (
    <span
      className={cn('inline-block w-1.5 h-1.5 rounded-full', KPI_QUALITY_DOT_CLASS[quality], className)}
      aria-label={`Data quality: ${quality}`}
      title={`Data quality: ${quality}`}
    />
  );
}

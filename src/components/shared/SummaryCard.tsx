/**
 * Summary metric surface backed by the AURA Visual System V2.
 * The public props stay stable so legacy callers inherit the unified UI
 * without page-by-page rewrites.
 */
import type { ElementType } from 'react';
import { Panel } from '@/components/v2';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'critical';
  icon: ElementType;
}

const STATUS_STYLE = {
  good: {
    text: 'v2-text-verified',
    surface: 'v2-surface-verified',
  },
  warning: {
    text: 'v2-text-simulated',
    surface: 'v2-surface-simulated',
  },
  critical: {
    text: 'v2-text-critical',
    surface: 'v2-surface-critical',
  },
} as const;

export function SummaryCard({ title, value, subtitle, status, icon: Icon }: SummaryCardProps) {
  const styles = STATUS_STYLE[status];

  return (
    <Panel className={`min-w-0 ${styles.surface}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background/70 ${styles.text}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="v2-label truncate">{title}</p>
          <p className={`v2-metric v2-metric-secondary mt-1 truncate ${styles.text}`}>{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
    </Panel>
  );
}

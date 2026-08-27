/**
 * Shared KPI semantics.
 *
 * KPI cards previously each carried their own copy of the status palette,
 * trend palette and improvement-direction heuristic. Duplicating that logic
 * let the same metric read as "good" on one surface and "bad" on another, and
 * it re-introduced hardcoded colour utilities that bypass the design tokens.
 *
 * This module is the single source of truth for KPI status/quality/trend
 * presentation and for the direction-of-improvement rule. It is presentation
 * only: it never infers provenance, liveness or measurement truth.
 */

export type KpiStatusTone = 'good' | 'warning' | 'critical' | 'neutral';
export type KpiQualityTone = 'good' | 'suspect' | 'stale' | 'unknown';
export type KpiTrendTone = 'improving' | 'declining' | 'flat';

/** Status tone used by the DC twin cards ("normal" is the good tone there). */
export type KpiSeverity = 'normal' | 'warning' | 'critical';

/** Badge classes for a KPI status chip. Semantic tokens only. */
export const KPI_STATUS_BADGE_CLASS: Record<KpiStatusTone, string> = {
  good: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

/** Value/emphasis text colour for a KPI severity. */
export const KPI_SEVERITY_TEXT_CLASS: Record<KpiSeverity, string> = {
  normal: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
};

/** Badge classes keyed by the DC twin severity vocabulary. */
export const KPI_SEVERITY_BADGE: Record<KpiSeverity, { label: string; className: string }> = {
  normal: { label: 'Stable', className: KPI_STATUS_BADGE_CLASS.good },
  warning: { label: 'Warning', className: KPI_STATUS_BADGE_CLASS.warning },
  critical: { label: 'Critical', className: KPI_STATUS_BADGE_CLASS.critical },
};

/** Data-quality dot colour. Quality is about the reading, not the value. */
export const KPI_QUALITY_DOT_CLASS: Record<KpiQualityTone, string> = {
  good: 'bg-success',
  suspect: 'bg-warning',
  stale: 'bg-warning/70',
  unknown: 'bg-muted-foreground',
};

/** Text colour for a directional KPI change. */
export const KPI_TREND_TEXT_CLASS: Record<KpiTrendTone, string> = {
  improving: 'text-success',
  declining: 'text-destructive',
  flat: 'text-muted-foreground',
};

/**
 * Metric codes whose improvement direction is inverted: a lower number is a
 * better outcome. Matched as substrings against the KPI code.
 */
export const LOWER_IS_BETTER_CODE_FRAGMENTS = [
  'error',
  'downtime',
  'churn',
  'false_positive',
  'stockout',
  'readmission',
] as const;

/** True when a lower value of this metric is the better outcome. */
export function isLowerBetterMetric(code: string | undefined | null): boolean {
  if (!code) return false;
  const normalized = code.toLowerCase();
  return LOWER_IS_BETTER_CODE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/**
 * Classify a change in a KPI value.
 *
 * `flat` is returned for a zero delta, or when `neutralPercentThreshold` is
 * supplied and the relative change falls under it.
 */
export function kpiTrendTone(
  delta: number,
  options: { lowerIsBetter?: boolean; percentChange?: number; neutralPercentThreshold?: number } = {},
): KpiTrendTone {
  const { lowerIsBetter = false, percentChange, neutralPercentThreshold } = options;
  if (delta === 0) return 'flat';
  if (
    neutralPercentThreshold !== undefined &&
    percentChange !== undefined &&
    Math.abs(percentChange) < neutralPercentThreshold
  ) {
    return 'flat';
  }
  const improving = lowerIsBetter ? delta < 0 : delta > 0;
  return improving ? 'improving' : 'declining';
}

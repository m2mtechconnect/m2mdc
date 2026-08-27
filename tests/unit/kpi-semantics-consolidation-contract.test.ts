/**
 * Contract: KPI cards share one semantics module.
 *
 * The audit found four independent KPI card implementations, each carrying its
 * own status palette and direction-of-improvement rule. That let identical
 * metrics render with different meanings and re-introduced hardcoded colour
 * utilities. These tests keep the semantics centralised.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isLowerBetterMetric,
  kpiTrendTone,
  KPI_STATUS_BADGE_CLASS,
  KPI_TREND_TEXT_CLASS,
} from '../../src/components/kpi/kpiSemantics';

const REPO = process.cwd();
const KPI_CARDS = [
  'src/components/shared/KpiCard.tsx',
  'src/components/simulation/EnterpriseKPICard.tsx',
  'src/components/data-centre-twin/overview/EnhancedKPICard.tsx',
  'src/components/builder/step5/deploy/SimulationKPICard.tsx',
];

const read = (file: string) => readFileSync(join(REPO, file), 'utf8');

describe('KPI semantics consolidation', () => {
  it.each(KPI_CARDS)('%s imports the shared KPI semantics module', (file) => {
    expect(read(file)).toContain('@/components/kpi/kpiSemantics');
  });

  it.each(KPI_CARDS)('%s uses design tokens rather than raw colour utilities', (file) => {
    const source = read(file);
    expect(source).not.toMatch(/text-(green|red|emerald)-\d{3}/);
    expect(source).not.toMatch(/bg-(green|red|emerald|amber)-\d{3}/);
  });

  it.each(KPI_CARDS)('%s does not redeclare a bespoke improvement heuristic', (file) => {
    expect(read(file)).not.toContain('isPositiveMetric');
  });

  it('classifies improvement direction consistently', () => {
    expect(isLowerBetterMetric('pue_error_rate')).toBe(true);
    expect(isLowerBetterMetric('throughput')).toBe(false);
    expect(kpiTrendTone(5)).toBe('improving');
    expect(kpiTrendTone(5, { lowerIsBetter: true })).toBe('declining');
    expect(kpiTrendTone(0)).toBe('flat');
    expect(kpiTrendTone(1, { percentChange: 0.2, neutralPercentThreshold: 0.5 })).toBe('flat');
  });

  it('exposes only token-based classes', () => {
    const classes = [...Object.values(KPI_STATUS_BADGE_CLASS), ...Object.values(KPI_TREND_TEXT_CLASS)];
    for (const value of classes) {
      expect(value).not.toMatch(/-(green|red|emerald|amber)-\d{3}/);
    }
  });
});

/**
 * Consolidation: the four cards share one presentation shell.
 *
 * They keep their own exported prop contracts and their own drill-down
 * behaviours (link navigation, dialog, overlay click); only the surface,
 * value, trend, status and quality primitives are shared.
 */
describe('KPI card shell consolidation', () => {
  it.each(KPI_CARDS)('%s composes the shared KPI card shell', (file) => {
    expect(read(file)).toContain('@/components/kpi/KpiCardShell');
  });

  it.each(KPI_CARDS)('%s no longer frames its own bare Card element', (file) => {
    expect(read(file)).not.toMatch(/<Card[\s>]/);
  });

  it('keeps each card\'s distinct prop contract', () => {
    expect(read(KPI_CARDS[0])).toContain('interface KpiCardProps');
    expect(read(KPI_CARDS[1])).toContain('kpiId');
    expect(read(KPI_CARDS[2])).toContain('interface EnhancedKPICardProps');
    expect(read(KPI_CARDS[3])).toContain('interface SimulationKPICardProps');
  });

  it('preserves the distinct drill-down behaviours', () => {
    // Dashboard card: link or click-through drill-down.
    expect(read(KPI_CARDS[0])).toContain('<Link');
    // Enterprise card: caller-owned overlay click.
    expect(read(KPI_CARDS[1])).toContain('onActivate={onClick');
    // DC twin card: dialog drill-down.
    expect(read(KPI_CARDS[2])).toContain('setShowDrilldown(true)');
    expect(read(KPI_CARDS[2])).toContain('<Dialog');
  });

  it('centralises the trend icon and status chip in the shell', () => {
    const shell = read('src/components/kpi/KpiCardShell.tsx');
    expect(shell).toContain('export function kpiTrendIcon');
    expect(shell).toContain('export function KpiStatusBadge');
    expect(shell).toContain('export function KpiCardSurface');
  });
});

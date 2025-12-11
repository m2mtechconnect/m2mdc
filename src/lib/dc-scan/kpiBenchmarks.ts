/**
 * KPI Benchmarks and Insight Generator
 * 
 * Generates enterprise KPI insights with:
 * - Industry benchmarks
 * - Target vs current comparison
 * - Executive-grade interpretations
 * - Risk color coding
 */

import type { DCScanIndustry, DCBlueprintTemplate } from '@/types/dcScan';
import type { KPIInsight, IndustryBenchmark, RegionalCarbonData, REGIONAL_CARBON_DATA } from '@/types/enhancedRecommendation';

// ============================================================================
// INDUSTRY BENCHMARKS (Based on Uptime Institute & Green Grid data)
// ============================================================================

export const INDUSTRY_BENCHMARKS: Record<DCScanIndustry, IndustryBenchmark> = {
  finance: {
    industry: 'finance',
    pue: { average: 1.45, best: 1.2, label: 'Financial Services avg' },
    renewableShare: { average: 45, best: 90, label: 'Sector avg' },
    carbonIntensity: { average: 150, best: 40, label: 'Sector avg' },
    uptime: { average: 99.95, best: 99.999, label: 'Tier III+ avg' },
    sovereignty: { average: 85, best: 100, label: 'OSFI compliant avg' },
  },
  government: {
    industry: 'government',
    pue: { average: 1.55, best: 1.3, label: 'Public sector avg' },
    renewableShare: { average: 35, best: 100, label: 'Federal target' },
    carbonIntensity: { average: 180, best: 30, label: 'GC net-zero path' },
    uptime: { average: 99.9, best: 99.999, label: 'Protected B avg' },
    sovereignty: { average: 100, best: 100, label: 'Canadian residency' },
  },
  retail: {
    industry: 'retail',
    pue: { average: 1.5, best: 1.25, label: 'Retail avg' },
    renewableShare: { average: 40, best: 85, label: 'Fortune 50 avg' },
    carbonIntensity: { average: 180, best: 55, label: 'E-commerce avg' },
    uptime: { average: 99.9, best: 99.99, label: 'Peak season target' },
    sovereignty: { average: 75, best: 95, label: 'Multi-region avg' },
  },
  telecom: {
    industry: 'telecom',
    pue: { average: 1.6, best: 1.35, label: 'Telco edge avg' },
    renewableShare: { average: 35, best: 70, label: 'Carrier avg' },
    carbonIntensity: { average: 200, best: 70, label: 'Network avg' },
    uptime: { average: 99.95, best: 99.999, label: 'Carrier grade' },
    sovereignty: { average: 70, best: 90, label: 'Regional avg' },
  },
  cloud_saas: {
    industry: 'cloud_saas',
    pue: { average: 1.35, best: 1.1, label: 'Hyperscaler avg' },
    renewableShare: { average: 65, best: 100, label: 'Top SaaS avg' },
    carbonIntensity: { average: 100, best: 20, label: 'Cloud avg' },
    uptime: { average: 99.95, best: 99.99, label: 'SaaS SLA avg' },
    sovereignty: { average: 75, best: 95, label: 'Multi-tenant avg' },
  },
  manufacturing: {
    industry: 'manufacturing',
    pue: { average: 1.55, best: 1.3, label: 'Industrial avg' },
    renewableShare: { average: 30, best: 70, label: 'Factory avg' },
    carbonIntensity: { average: 220, best: 80, label: 'IIoT avg' },
    uptime: { average: 99.9, best: 99.99, label: 'OT avg' },
    sovereignty: { average: 65, best: 85, label: 'Regional avg' },
  },
  healthcare: {
    industry: 'healthcare',
    pue: { average: 1.5, best: 1.3, label: 'Healthcare avg' },
    renewableShare: { average: 35, best: 75, label: 'Hospital avg' },
    carbonIntensity: { average: 170, best: 60, label: 'Clinical avg' },
    uptime: { average: 99.99, best: 99.999, label: 'Life-critical' },
    sovereignty: { average: 100, best: 100, label: 'HIPAA/PHIPA' },
  },
  energy: {
    industry: 'energy',
    pue: { average: 1.4, best: 1.1, label: 'Utility avg' },
    renewableShare: { average: 70, best: 100, label: 'Green grid' },
    carbonIntensity: { average: 80, best: 10, label: 'Clean energy' },
    uptime: { average: 99.99, best: 99.999, label: 'Grid-critical' },
    sovereignty: { average: 80, best: 95, label: 'NERC CIP' },
  },
  ai_compute: {
    industry: 'ai_compute',
    pue: { average: 1.25, best: 1.1, label: 'GPU cluster avg' },
    renewableShare: { average: 70, best: 100, label: 'AI lab avg' },
    carbonIntensity: { average: 90, best: 25, label: 'Training avg' },
    uptime: { average: 99.9, best: 99.95, label: 'HPC avg' },
    sovereignty: { average: 85, best: 100, label: 'Model hosting' },
  },
  other: {
    industry: 'other',
    pue: { average: 1.55, best: 1.3, label: 'Enterprise avg' },
    renewableShare: { average: 40, best: 80, label: 'Industry avg' },
    carbonIntensity: { average: 170, best: 65, label: 'Typical DC' },
    uptime: { average: 99.9, best: 99.99, label: 'Tier III avg' },
    sovereignty: { average: 75, best: 90, label: 'Standard' },
  },
};

// ============================================================================
// KPI INSIGHT GENERATORS
// ============================================================================

interface KPIConfig {
  value: number;
  target: number;
  industry: DCScanIndustry;
  regionCode?: string;
}

/**
 * Determine KPI status based on value vs target
 */
function getKPIStatus(
  value: number, 
  target: number, 
  direction: 'lower_is_better' | 'higher_is_better'
): 'excellent' | 'good' | 'warning' | 'critical' {
  const ratio = direction === 'lower_is_better' 
    ? target / value  // Lower is better: ratio > 1 is good
    : value / target; // Higher is better: ratio > 1 is good
  
  if (ratio >= 1.0) return 'excellent';
  if (ratio >= 0.9) return 'good';
  if (ratio >= 0.75) return 'warning';
  return 'critical';
}

/**
 * Generate PUE insight
 */
export function generatePUEInsight(config: KPIConfig): KPIInsight {
  const benchmark = INDUSTRY_BENCHMARKS[config.industry];
  const status = getKPIStatus(config.value, config.target, 'lower_is_better');
  
  let interpretation = '';
  if (config.value <= benchmark.pue.best) {
    interpretation = `Achieves best-in-class efficiency. Among the top 10% of ${benchmark.pue.label}.`;
  } else if (config.value <= config.target) {
    interpretation = `Meets green-performance target. Cooling optimization can push toward ${benchmark.pue.best}.`;
  } else if (config.value <= benchmark.pue.average) {
    interpretation = `Below target but within ${benchmark.pue.label}. Cooling improvements recommended.`;
  } else {
    interpretation = `Above ${benchmark.pue.label}. Significant cooling and airflow optimization required.`;
  }
  
  return {
    id: 'pue',
    name: 'PUE',
    value: config.value,
    unit: 'ratio',
    target: config.target,
    industryBenchmark: benchmark.pue.average,
    benchmarkLabel: benchmark.pue.label,
    interpretation,
    status,
    direction: 'lower_is_better',
  };
}

/**
 * Generate Renewable Energy insight
 */
export function generateRenewableInsight(config: KPIConfig): KPIInsight {
  const benchmark = INDUSTRY_BENCHMARKS[config.industry];
  const status = getKPIStatus(config.value, config.target, 'higher_is_better');
  
  let interpretation = '';
  if (config.value >= benchmark.renewableShare.best) {
    interpretation = `Exceeds sustainability targets. Industry-leading renewable penetration.`;
  } else if (config.value >= config.target) {
    interpretation = `Meets renewable target. Further gains possible via load shifting to green hours.`;
  } else if (config.value >= benchmark.renewableShare.average) {
    interpretation = `Above ${benchmark.renewableShare.label}. PPA expansion could close gap to target.`;
  } else {
    interpretation = `Below ${benchmark.renewableShare.label}. Renewable procurement strategy needed.`;
  }
  
  return {
    id: 'renewable-share',
    name: 'Renewable Energy',
    value: config.value,
    unit: '%',
    target: config.target,
    industryBenchmark: benchmark.renewableShare.average,
    benchmarkLabel: benchmark.renewableShare.label,
    interpretation,
    status,
    direction: 'higher_is_better',
  };
}

/**
 * Generate Carbon Intensity insight
 */
export function generateCarbonInsight(config: KPIConfig, regionCode?: string): KPIInsight {
  const benchmark = INDUSTRY_BENCHMARKS[config.industry];
  const status = getKPIStatus(config.value, config.target, 'lower_is_better');
  
  let regionLabel = benchmark.carbonIntensity.label;
  if (regionCode) {
    const regionLabels: Record<string, string> = {
      'ca-central-1': 'CA-QC grid',
      'ca-east-1': 'CA-ON grid',
      'ca-west-1': 'CA-BC grid',
      'ca-west-2': 'CA-AB grid',
    };
    regionLabel = regionLabels[regionCode] || regionLabel;
  }
  
  let interpretation = '';
  if (config.value <= benchmark.carbonIntensity.best) {
    interpretation = `Achieves near-zero emissions profile. Exceeds ${regionLabel} best practices.`;
  } else if (config.value <= config.target) {
    interpretation = `Meets carbon target. ${Math.round((1 - config.value / benchmark.carbonIntensity.average) * 100)}% lower than ${benchmark.carbonIntensity.label}.`;
  } else if (config.value <= benchmark.carbonIntensity.average) {
    interpretation = `Below target but outperforms ${benchmark.carbonIntensity.label}. Workload shifting recommended.`;
  } else {
    interpretation = `Above ${benchmark.carbonIntensity.label}. Grid decarbonization or location change needed.`;
  }
  
  return {
    id: 'carbon-intensity',
    name: 'Carbon Intensity',
    value: config.value,
    unit: 'gCO₂/kWh',
    target: config.target,
    industryBenchmark: benchmark.carbonIntensity.average,
    benchmarkLabel: regionLabel,
    interpretation,
    status,
    direction: 'lower_is_better',
  };
}

/**
 * Generate Uptime insight
 */
export function generateUptimeInsight(config: KPIConfig): KPIInsight {
  const benchmark = INDUSTRY_BENCHMARKS[config.industry];
  const status = getKPIStatus(config.value, config.target, 'higher_is_better');
  
  let interpretation = '';
  if (config.value >= 99.999) {
    interpretation = `Five-nines availability. Exceptional for ${config.industry} sector.`;
  } else if (config.value >= config.target) {
    interpretation = `Meets SLA target. Redundancy adequate for ${benchmark.uptime.label}.`;
  } else if (config.value >= benchmark.uptime.average) {
    interpretation = `Above ${benchmark.uptime.label}. Power/cooling redundancy review recommended.`;
  } else {
    interpretation = `Below ${benchmark.uptime.label}. Infrastructure upgrade required.`;
  }
  
  return {
    id: 'uptime',
    name: 'Uptime',
    value: config.value,
    unit: '%',
    target: config.target,
    industryBenchmark: benchmark.uptime.average,
    benchmarkLabel: benchmark.uptime.label,
    interpretation,
    status,
    direction: 'higher_is_better',
  };
}

/**
 * Generate Sovereignty insight
 */
export function generateSovereigntyInsight(config: KPIConfig): KPIInsight {
  const benchmark = INDUSTRY_BENCHMARKS[config.industry];
  const status = getKPIStatus(config.value, config.target, 'higher_is_better');
  
  let interpretation = '';
  if (config.value >= 100) {
    interpretation = `Full sovereign compute. All workloads processed within jurisdiction.`;
  } else if (config.value >= config.target) {
    interpretation = `Meets sovereignty target. Minor cross-border flows within policy.`;
  } else if (config.value >= benchmark.sovereignty.average) {
    interpretation = `Above ${benchmark.sovereignty.label}. Data routing optimization recommended.`;
  } else {
    interpretation = `Below ${benchmark.sovereignty.label}. Sovereignty enforcement required.`;
  }
  
  return {
    id: 'sovereignty',
    name: 'Sovereign Compute',
    value: config.value,
    unit: '%',
    target: config.target,
    industryBenchmark: benchmark.sovereignty.average,
    benchmarkLabel: benchmark.sovereignty.label,
    interpretation,
    status,
    direction: 'higher_is_better',
  };
}

/**
 * Generate all KPI insights for a recommendation
 */
export function generateAllKPIInsights(
  template: DCBlueprintTemplate,
  industry: DCScanIndustry,
  regionCode?: string
): KPIInsight[] {
  return [
    generatePUEInsight({
      value: template.targetPue,
      target: template.targetPue,
      industry,
    }),
    generateRenewableInsight({
      value: template.renewableTargetPct,
      target: template.renewableTargetPct,
      industry,
    }),
    generateCarbonInsight({
      value: 70, // Estimate based on template
      target: template.annualCarbonTargetTonnes > 0 ? 65 : 100,
      industry,
    }, regionCode),
    generateSovereigntyInsight({
      value: template.sovereignComputePct,
      target: template.sovereignComputePct,
      industry,
    }),
    generateUptimeInsight({
      value: 99.95, // Default based on tier
      target: 99.9,
      industry,
    }),
  ];
}

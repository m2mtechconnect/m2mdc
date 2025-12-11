/**
 * KPI Overlay Engine
 * Enterprise-grade rendering engine for KPI charts
 * Features: Threshold zones, anomaly detection, forecasting, event markers, causal links
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * KPI DEFINITIONS & THRESHOLDS:
 * - The Green Grid - PUE/DCiE Metrics
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 *   PUE targets: Excellent <1.2, Average 1.4-1.6, Poor >1.8
 * - Uptime Institute PUE Benchmark Survey
 *   https://uptimeinstitute.com/resources/research-and-reports
 * - ASHRAE TC 9.9 Thermal Guidelines (Temperature thresholds)
 *   https://tc0909.ashraetcs.org/documents.php
 * 
 * ANOMALY DETECTION METHODS:
 * - Statistical Process Control (SPC) - Z-score detection
 *   https://asq.org/quality-resources/statistical-process-control
 * - Prometheus Recording Rules for Anomaly Detection
 *   https://prometheus.io/docs/practices/rules/
 * - Netflix Atlas Anomaly Detection Framework
 *   https://netflixtechblog.com/
 * 
 * TIME-SERIES FORECASTING:
 * - Linear Regression for Trend Prediction
 *   https://otexts.com/fpp3/regression.html
 * - Exponential Smoothing Methods (Holt-Winters)
 *   https://otexts.com/fpp3/expsmooth.html
 * - Prophet Forecasting (Facebook/Meta)
 *   https://facebook.github.io/prophet/
 * 
 * CORRELATION & CAUSAL ANALYSIS:
 * - Pearson Correlation Coefficient
 *   https://www.statisticshowto.com/probability-and-statistics/correlation-coefficient-formula/
 * - Granger Causality Testing
 *   https://en.wikipedia.org/wiki/Granger_causality
 * - Root Cause Analysis (RCA) Methodologies
 *   https://asq.org/quality-resources/root-cause-analysis
 * 
 * OBSERVABILITY PATTERNS:
 * - Google SRE Book - Service Level Objectives (SLOs)
 *   https://sre.google/sre-book/service-level-objectives/
 * - Datadog KPI Dashboard Best Practices
 *   https://www.datadoghq.com/blog/
 * - Grafana Alerting Thresholds
 *   https://grafana.com/docs/grafana/latest/alerting/
 * 
 * DATA CENTER SPECIFIC KPIS:
 * - NVIDIA DCGM (Data Center GPU Manager) Metrics
 *   https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/index.html
 * - Schneider Electric Data Center Metrics (White Paper 100)
 *   https://www.se.com/ww/en/download/document/WP100/
 * - Uptime Institute M&O KPI Framework
 *   https://uptimeinstitute.com/tier-certification/management-operations
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  KPISnapshot,
  KPIThresholdConfig,
  KPIThresholdBand,
  KPIAnomaly,
  KPIForecast,
  KPICausalLink,
  SimulationEvent,
  EnhancedKPIConfig,
} from '@/simulation/types';

// ============================================================================
// DEFAULT KPI CONFIGURATIONS
// ============================================================================

export const DEFAULT_KPI_CONFIGS: Record<string, EnhancedKPIConfig> = {
  pue: {
    id: 'pue',
    name: 'Power Usage Effectiveness',
    description: 'Ratio of total facility power to IT equipment power',
    unit: '',
    domain: 'power_ups',
    thresholds: {
      kpiId: 'pue',
      bands: [
        { min: 1.0, max: 1.2, severity: 'safe', color: 'hsl(var(--success))', label: 'Excellent' },
        { min: 1.2, max: 1.5, severity: 'warning', color: 'hsl(var(--warning))', label: 'Acceptable' },
        { min: 1.5, max: 3.0, severity: 'critical', color: 'hsl(var(--destructive))', label: 'Poor' },
      ],
      target: 1.2,
      warningThreshold: 1.4,
      criticalThreshold: 1.6,
      lowerIsBetter: true,
    },
    target: 1.2,
    warningLevel: 1.4,
    criticalLevel: 1.6,
    lowerIsBetter: true,
    forecastEnabled: true,
    forecastHorizonMinutes: 15,
    anomalyDetectionEnabled: true,
    anomalySensitivity: 'medium',
    causalLinks: ['gpuUtilization', 'coolingEfficiencyIndex', 'thermalStabilityScore'],
    color: 'hsl(var(--warning))',
    businessImpact: 'Higher PUE means more energy waste and increased operating costs',
    whyItMatters: 'Every 0.1 increase in PUE can mean 5-10% higher electricity bills',
  },
  gpuUtilization: {
    id: 'gpuUtilization',
    name: 'GPU Utilization',
    description: 'Average GPU compute utilization across all clusters',
    unit: '%',
    domain: 'workload_gpu',
    thresholds: {
      kpiId: 'gpuUtilization',
      bands: [
        { min: 0, max: 50, severity: 'warning', color: 'hsl(var(--warning))', label: 'Underutilized' },
        { min: 50, max: 85, severity: 'safe', color: 'hsl(var(--success))', label: 'Optimal' },
        { min: 85, max: 100, severity: 'critical', color: 'hsl(var(--destructive))', label: 'Overloaded' },
      ],
      target: 75,
      warningThreshold: 85,
      criticalThreshold: 95,
      lowerIsBetter: false,
    },
    target: 75,
    warningLevel: 85,
    criticalLevel: 95,
    lowerIsBetter: false,
    forecastEnabled: true,
    forecastHorizonMinutes: 10,
    anomalyDetectionEnabled: true,
    anomalySensitivity: 'high',
    causalLinks: ['thermalStabilityScore', 'powerReliabilityScore', 'pue'],
    color: 'hsl(var(--primary))',
    businessImpact: 'GPU utilization directly affects training throughput and ROI',
    whyItMatters: 'Underutilization wastes expensive GPU capacity; overutilization causes thermal throttling',
  },
  thermalStabilityScore: {
    id: 'thermalStabilityScore',
    name: 'Thermal Stability',
    description: 'Overall thermal health score across all cooling zones',
    unit: '%',
    domain: 'thermal_hardware',
    thresholds: {
      kpiId: 'thermalStabilityScore',
      bands: [
        { min: 0, max: 60, severity: 'critical', color: 'hsl(var(--destructive))', label: 'Critical' },
        { min: 60, max: 80, severity: 'warning', color: 'hsl(var(--warning))', label: 'At Risk' },
        { min: 80, max: 100, severity: 'safe', color: 'hsl(var(--success))', label: 'Stable' },
      ],
      target: 90,
      warningThreshold: 75,
      criticalThreshold: 60,
      lowerIsBetter: false,
    },
    target: 90,
    warningLevel: 75,
    criticalLevel: 60,
    lowerIsBetter: false,
    forecastEnabled: true,
    forecastHorizonMinutes: 15,
    anomalyDetectionEnabled: true,
    anomalySensitivity: 'high',
    causalLinks: ['coolingEfficiencyIndex', 'gpuUtilization', 'pue'],
    color: 'hsl(var(--destructive))',
    businessImpact: 'Thermal instability can cause hardware throttling and failures',
    whyItMatters: 'Poor thermal stability reduces GPU performance and risks equipment damage',
  },
  coolingEfficiencyIndex: {
    id: 'coolingEfficiencyIndex',
    name: 'Cooling Efficiency',
    description: 'Efficiency of cooling systems relative to heat load',
    unit: '%',
    domain: 'cooling',
    thresholds: {
      kpiId: 'coolingEfficiencyIndex',
      bands: [
        { min: 0, max: 60, severity: 'critical', color: 'hsl(var(--destructive))', label: 'Inefficient' },
        { min: 60, max: 80, severity: 'warning', color: 'hsl(var(--warning))', label: 'Suboptimal' },
        { min: 80, max: 100, severity: 'safe', color: 'hsl(var(--success))', label: 'Efficient' },
      ],
      target: 85,
      warningThreshold: 70,
      criticalThreshold: 55,
      lowerIsBetter: false,
    },
    target: 85,
    warningLevel: 70,
    criticalLevel: 55,
    lowerIsBetter: false,
    forecastEnabled: true,
    forecastHorizonMinutes: 10,
    anomalyDetectionEnabled: true,
    anomalySensitivity: 'medium',
    causalLinks: ['thermalStabilityScore', 'pue'],
    color: 'hsl(var(--info))',
    businessImpact: 'Cooling inefficiency directly increases energy costs',
    whyItMatters: 'Every 1% improvement in cooling efficiency can save significant energy costs',
  },
  emissionsVsTarget: {
    id: 'emissionsVsTarget',
    name: 'Carbon vs Target',
    description: 'Current emissions relative to sustainability targets',
    unit: '%',
    domain: 'financial_carbon',
    thresholds: {
      kpiId: 'emissionsVsTarget',
      bands: [
        { min: -100, max: -10, severity: 'safe', color: 'hsl(var(--success))', label: 'Under Target' },
        { min: -10, max: 10, severity: 'warning', color: 'hsl(var(--warning))', label: 'Near Target' },
        { min: 10, max: 100, severity: 'critical', color: 'hsl(var(--destructive))', label: 'Over Target' },
      ],
      target: 0,
      warningThreshold: 10,
      criticalThreshold: 25,
      lowerIsBetter: true,
    },
    target: 0,
    warningLevel: 10,
    criticalLevel: 25,
    lowerIsBetter: true,
    forecastEnabled: true,
    forecastHorizonMinutes: 30,
    anomalyDetectionEnabled: true,
    anomalySensitivity: 'low',
    causalLinks: ['pue', 'gpuUtilization'],
    color: 'hsl(var(--success))',
    businessImpact: 'Emissions overages can trigger carbon taxes and regulatory penalties',
    whyItMatters: 'Staying within carbon targets protects against financial penalties and reputational risk',
  },
  sovereignComplianceScore: {
    id: 'sovereignComplianceScore',
    name: 'Sovereignty Score',
    description: 'Compliance with data sovereignty requirements',
    unit: '%',
    domain: 'sovereignty',
    thresholds: {
      kpiId: 'sovereignComplianceScore',
      bands: [
        { min: 0, max: 85, severity: 'critical', color: 'hsl(var(--destructive))', label: 'Non-Compliant' },
        { min: 85, max: 95, severity: 'warning', color: 'hsl(var(--warning))', label: 'At Risk' },
        { min: 95, max: 100, severity: 'safe', color: 'hsl(var(--success))', label: 'Compliant' },
      ],
      target: 100,
      warningThreshold: 95,
      criticalThreshold: 85,
      lowerIsBetter: false,
    },
    target: 100,
    warningLevel: 95,
    criticalLevel: 85,
    lowerIsBetter: false,
    forecastEnabled: false,
    forecastHorizonMinutes: 0,
    anomalyDetectionEnabled: true,
    anomalySensitivity: 'high',
    causalLinks: [],
    color: 'hsl(var(--accent))',
    businessImpact: 'Non-compliance can result in legal penalties and loss of government contracts',
    whyItMatters: 'Sovereign compliance is mandatory for government and regulated workloads',
  },
};

// ============================================================================
// ANOMALY DETECTION ENGINE
// ============================================================================

export function detectAnomalies(
  snapshots: KPISnapshot[],
  kpiId: string,
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): KPIAnomaly[] {
  if (snapshots.length < 5) return [];

  const values = snapshots.map(s => s[kpiId] ?? 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

  const thresholdMultiplier = sensitivity === 'high' ? 1.5 : sensitivity === 'medium' ? 2 : 2.5;
  const anomalies: KPIAnomaly[] = [];

  for (let i = 1; i < snapshots.length; i++) {
    const value = snapshots[i][kpiId] ?? 0;
    const prevValue = snapshots[i - 1][kpiId] ?? 0;
    const deviation = Math.abs(value - mean) / (stdDev || 1);

    if (deviation > thresholdMultiplier) {
      const type = value > prevValue ? 'spike' : 'dip';
      anomalies.push({
        id: `anomaly-${kpiId}-${i}`,
        kpiId,
        timestamp: snapshots[i].timestamp,
        type,
        value,
        expectedValue: mean,
        deviation: ((value - mean) / mean) * 100,
        severity: deviation > thresholdMultiplier * 1.5 ? 'high' : deviation > thresholdMultiplier * 1.2 ? 'medium' : 'low',
        description: `${type === 'spike' ? 'Unexpected increase' : 'Unexpected decrease'} of ${Math.abs(((value - mean) / mean) * 100).toFixed(1)}% from baseline`,
        possibleCauses: getPossibleCauses(kpiId, type),
      });
    }
  }

  return anomalies;
}

function getPossibleCauses(kpiId: string, type: 'spike' | 'dip'): string[] {
  const causes: Record<string, Record<string, string[]>> = {
    pue: {
      spike: ['Cooling system failure', 'Sudden GPU load increase', 'CRAH unit malfunction'],
      dip: ['Improved cooling efficiency', 'Workload migration', 'Equipment shutdown'],
    },
    gpuUtilization: {
      spike: ['Training job started', 'Batch inference queue', 'Distributed workload'],
      dip: ['Job completion', 'Node failure', 'Throttling due to thermal'],
    },
    thermalStabilityScore: {
      spike: ['Cooling optimization applied', 'Workload reduction', 'Free cooling activated'],
      dip: ['CRAH failure', 'GPU overload', 'Containment breach'],
    },
  };

  return causes[kpiId]?.[type] || ['Environmental change', 'Workload pattern shift'];
}

// ============================================================================
// FORECAST ENGINE
// ============================================================================

export function generateForecast(
  snapshots: KPISnapshot[],
  kpiId: string,
  horizonMinutes: number = 15
): KPIForecast {
  if (snapshots.length < 3) {
    return {
      kpiId,
      currentValue: snapshots[snapshots.length - 1]?.[kpiId] ?? 0,
      predictions: [],
      trend: 'stable',
      trendConfidence: 50,
    };
  }

  const values = snapshots.slice(-10).map(s => s[kpiId] ?? 0);
  const currentValue = values[values.length - 1];
  
  // Simple linear regression for trend
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Generate predictions
  const predictions = [];
  const lastTimestamp = snapshots[snapshots.length - 1].timestamp;
  const interval = 60; // 1 minute intervals
  
  for (let i = 1; i <= horizonMinutes; i++) {
    const predictedValue = intercept + slope * (n - 1 + i);
    const confidence = Math.max(20, 95 - i * 4); // Confidence decreases over time
    const variance = Math.abs(slope) * i * 0.5;
    
    predictions.push({
      timestamp: lastTimestamp + i * interval,
      value: predictedValue,
      confidence,
      upperBound: predictedValue + variance,
      lowerBound: predictedValue - variance,
    });
  }

  const trend = slope > 0.1 ? 'degrading' : slope < -0.1 ? 'improving' : 'stable';
  const trendConfidence = Math.min(95, 50 + Math.abs(slope) * 20);

  return {
    kpiId,
    currentValue,
    predictions,
    trend: DEFAULT_KPI_CONFIGS[kpiId]?.lowerIsBetter 
      ? (slope > 0.1 ? 'degrading' : slope < -0.1 ? 'improving' : 'stable')
      : (slope > 0.1 ? 'improving' : slope < -0.1 ? 'degrading' : 'stable'),
    trendConfidence,
  };
}

// ============================================================================
// CORRELATION ENGINE
// ============================================================================

export function calculateCorrelationMatrix(
  snapshots: KPISnapshot[],
  kpiIds: string[]
): { matrix: number[][]; topDrivers: { kpi: string; strength: number }[] } {
  if (snapshots.length < 5 || kpiIds.length < 2) {
    return { matrix: [], topDrivers: [] };
  }

  const matrix: number[][] = [];
  const correlations: { source: string; target: string; value: number }[] = [];

  for (let i = 0; i < kpiIds.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < kpiIds.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const correlation = calculatePearsonCorrelation(
          snapshots.map(s => s[kpiIds[i]] ?? 0),
          snapshots.map(s => s[kpiIds[j]] ?? 0)
        );
        matrix[i][j] = correlation;
        correlations.push({ source: kpiIds[i], target: kpiIds[j], value: Math.abs(correlation) });
      }
    }
  }

  // Find top drivers for each KPI
  const topDrivers = kpiIds.map(kpi => {
    const drivers = correlations
      .filter(c => c.target === kpi)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    
    return {
      kpi,
      strength: drivers[0]?.value || 0,
    };
  }).sort((a, b) => b.strength - a.strength);

  return { matrix, topDrivers };
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  return denominator !== 0 ? numerator / denominator : 0;
}

// ============================================================================
// HOVER INSIGHTS ENGINE
// ============================================================================

export function generateHoverInsight(
  kpiId: string,
  value: number,
  timestamp: number,
  snapshots: KPISnapshot[],
  events: SimulationEvent[]
): { title: string; description: string; relatedEvents: SimulationEvent[] } {
  const config = DEFAULT_KPI_CONFIGS[kpiId];
  if (!config) {
    return { title: 'Unknown KPI', description: '', relatedEvents: [] };
  }

  // Find events around this timestamp
  const relatedEvents = events.filter(
    e => Math.abs(e.timestamp - timestamp) <= 30 && 
         (e.affectedKpis?.includes(kpiId) || e.domain === config.domain)
  );

  // Determine severity based on thresholds
  const band = config.thresholds.bands.find(
    b => value >= b.min && value <= b.max
  );

  // Calculate delta from baseline
  const baseline = snapshots[0]?.[kpiId] ?? value;
  const delta = value - baseline;
  const deltaPercent = ((delta / baseline) * 100).toFixed(1);

  let description = '';
  if (relatedEvents.length > 0) {
    description = `Caused by: ${relatedEvents[0].title}. `;
  }
  
  description += `${Math.abs(Number(deltaPercent))}% ${delta >= 0 ? 'increase' : 'decrease'} from baseline. `;
  description += config.whyItMatters;

  return {
    title: `${config.name}: ${value.toFixed(2)}${config.unit}`,
    description,
    relatedEvents,
  };
}

// ============================================================================
// THRESHOLD ZONE HELPERS
// ============================================================================

export function getThresholdZoneForValue(
  kpiId: string,
  value: number
): KPIThresholdBand | null {
  const config = DEFAULT_KPI_CONFIGS[kpiId];
  if (!config) return null;

  return config.thresholds.bands.find(
    band => value >= band.min && value <= band.max
  ) || null;
}

export function getDistanceToTarget(kpiId: string, value: number): number {
  const config = DEFAULT_KPI_CONFIGS[kpiId];
  if (!config) return 0;

  return Math.abs(value - config.target);
}

export function getDistanceToThreshold(
  kpiId: string,
  value: number,
  thresholdType: 'warning' | 'critical'
): number {
  const config = DEFAULT_KPI_CONFIGS[kpiId];
  if (!config) return 0;

  const threshold = thresholdType === 'warning' 
    ? config.warningLevel 
    : config.criticalLevel;

  return config.lowerIsBetter 
    ? threshold - value 
    : value - threshold;
}

// Export the engine as a class for advanced use
export class KPIOverlayEngine {
  private snapshots: KPISnapshot[] = [];
  private events: SimulationEvent[] = [];
  private anomalies: Map<string, KPIAnomaly[]> = new Map();
  private forecasts: Map<string, KPIForecast> = new Map();

  updateSnapshots(snapshots: KPISnapshot[]): void {
    this.snapshots = snapshots;
    this.recalculateAll();
  }

  updateEvents(events: SimulationEvent[]): void {
    this.events = events;
  }

  private recalculateAll(): void {
    const kpiIds = Object.keys(DEFAULT_KPI_CONFIGS);
    
    for (const kpiId of kpiIds) {
      const config = DEFAULT_KPI_CONFIGS[kpiId];
      
      if (config.anomalyDetectionEnabled) {
        this.anomalies.set(kpiId, detectAnomalies(this.snapshots, kpiId, config.anomalySensitivity));
      }
      
      if (config.forecastEnabled) {
        this.forecasts.set(kpiId, generateForecast(this.snapshots, kpiId, config.forecastHorizonMinutes));
      }
    }
  }

  getAnomalies(kpiId: string): KPIAnomaly[] {
    return this.anomalies.get(kpiId) || [];
  }

  getForecast(kpiId: string): KPIForecast | undefined {
    return this.forecasts.get(kpiId);
  }

  getCorrelationMatrix(): ReturnType<typeof calculateCorrelationMatrix> {
    return calculateCorrelationMatrix(this.snapshots, Object.keys(DEFAULT_KPI_CONFIGS));
  }

  getHoverInsight(kpiId: string, value: number, timestamp: number): ReturnType<typeof generateHoverInsight> {
    return generateHoverInsight(kpiId, value, timestamp, this.snapshots, this.events);
  }
}

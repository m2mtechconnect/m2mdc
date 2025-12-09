// Centralized metrics registry - single source of truth for all KPIs

export type MetricKey =
  | 'roi_growth'
  | 'compliance_accuracy'
  | 'active_users'
  | 'time_saved'
  | 'agents_deployed'
  | 'total_runs'
  | 'success_rate'
  | 'avg_latency'
  | 'uptime';

export type MetricFormat = 'percent' | 'int' | 'hours' | 'seconds' | 'currency';

export interface MetricDefinition {
  label: string;
  fmt: MetricFormat;
  source: string;
  icon?: string;
  description?: string;
}

export const METRIC_DEFS: Record<MetricKey, MetricDefinition> = {
  roi_growth: {
    label: 'Total ROI Growth',
    fmt: 'percent',
    source: '/api/metrics/roi',
    description: 'Return on investment across all systems',
  },
  compliance_accuracy: {
    label: 'Compliance Accuracy',
    fmt: 'percent',
    source: '/api/metrics/compliance',
    description: 'Overall compliance success rate',
  },
  active_users: {
    label: 'Active Users',
    fmt: 'int',
    source: '/api/metrics/users',
    description: 'Users actively using AI systems',
  },
  time_saved: {
    label: 'Time Saved',
    fmt: 'hours',
    source: '/api/metrics/time',
    description: 'Total hours saved through automation',
  },
  agents_deployed: {
    label: 'Agents Deployed',
    fmt: 'int',
    source: '/api/metrics/agents',
    description: 'Active AI systems in production',
  },
  total_runs: {
    label: 'Total Runs',
    fmt: 'int',
    source: '/api/metrics/runs',
    description: 'Total AI system executions',
  },
  success_rate: {
    label: 'Success Rate',
    fmt: 'percent',
    source: '/api/metrics/success',
    description: 'Percentage of successful runs',
  },
  avg_latency: {
    label: 'Avg Latency',
    fmt: 'seconds',
    source: '/api/ops/latency',
    description: 'Average response time across systems',
  },
  uptime: {
    label: 'System Uptime',
    fmt: 'percent',
    source: '/api/ops/uptime',
    description: 'Overall system availability',
  },
};

export const formatMetricValue = (value: number | string, format: MetricFormat): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  switch (format) {
    case 'percent':
      return `${numValue}%`;
    case 'int':
      return numValue.toLocaleString();
    case 'hours':
      return `${numValue.toLocaleString()} hrs`;
    case 'seconds':
      return `${numValue.toFixed(1)}s`;
    case 'currency':
      return `$${numValue.toLocaleString()}`;
    default:
      return String(value);
  }
};

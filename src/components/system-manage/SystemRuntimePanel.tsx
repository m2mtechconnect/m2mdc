import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, CheckCircle2, Activity } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';
import type { DeployedSystem } from '@/types/system';
import { MetricValue } from '@/components/provenance/MetricValue';
import { demoMetric, unavailableMetric } from '@/lib/provenance';
import type { ProvenancedMetric } from '@/lib/provenance/types';

interface SystemRuntimePanelProps {
  system: DeployedSystem;
}

/**
 * Displays live runtime metrics for a deployed system
 * Each metric card is clickable to navigate to detailed analytics
 */
export function SystemRuntimePanel({ system }: SystemRuntimePanelProps) {
  const navigate = useNavigate();

  // Phase 1A.1 §3: values below are synthesized from the `DeployedSystem`
  // fixture object; there is no wired telemetry today. They MUST be labelled
  // `demo` so operators are not led to believe they are live measurements.
  const lastRunMetric: ProvenancedMetric<string> = system.lastRun
    ? demoMetric<string>(formatRelativeTime(system.lastRun.timestamp), 'system-fixture')
    : unavailableMetric<string>('system-fixture', 'System has never run.');
  const successRateMetric: ProvenancedMetric<number> =
    typeof system.successRate === 'number'
      ? demoMetric<number>(Math.round(system.successRate), 'system-fixture')
      : unavailableMetric<number>('system-fixture');
  const avgDurationMetric: ProvenancedMetric<number> =
    typeof system.avgDuration === 'number'
      ? demoMetric<number>(system.avgDuration, 'system-fixture')
      : unavailableMetric<number>('system-fixture');
  const roiMetric: ProvenancedMetric<number> =
    typeof system.roi === 'number'
      ? demoMetric<number>(system.roi, 'system-fixture')
      : unavailableMetric<number>('system-fixture');

  const metrics = [
    {
      id: 'last-run',
      label: 'Last Run',
      metric: lastRunMetric,
      subvalue: system.lastRun?.channel || '',
      icon: Clock,
      unit: '',
      onClick: () => navigate(`/analytics?tab=monitoring&system=${system.id}`),
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      metric: successRateMetric,
      subvalue: 'Last 7 days',
      icon: CheckCircle2,
      unit: '%',
      onClick: () => navigate(`/analytics?tab=performance&system=${system.id}`),
    },
    {
      id: 'avg-duration',
      label: 'Avg Duration',
      metric: avgDurationMetric,
      subvalue: 'Response time',
      icon: Activity,
      unit: 'ms',
      onClick: () => navigate(`/analytics?tab=performance&system=${system.id}`),
    },
    {
      id: 'roi',
      label: 'ROI',
      metric: roiMetric,
      subvalue: 'Current period',
      icon: TrendingUp,
      unit: '%',
      onClick: () => navigate(`/analytics?tab=roi&system=${system.id}`),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <Card
          key={idx}
          className="p-4 cursor-pointer hover:shadow-lg transition-smooth group"
          onClick={metric.onClick}
        >
          <MetricValue
            id={metric.id}
            label={metric.label}
            metric={metric.metric as ProvenancedMetric<number | string>}
            unit={metric.unit || undefined}
            icon={<metric.icon className="h-4 w-4 text-primary" />}
            footer={metric.subvalue}
          />
          <div className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View details →
          </div>
        </Card>
      ))}
    </div>
  );
}

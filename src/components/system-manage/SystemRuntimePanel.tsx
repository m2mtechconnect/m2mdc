import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, CheckCircle2, Activity } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';
import type { DeployedSystem } from '@/types/system';

interface SystemRuntimePanelProps {
  system: DeployedSystem;
}

/**
 * Displays live runtime metrics for a deployed system
 * Each metric card is clickable to navigate to detailed analytics
 */
export function SystemRuntimePanel({ system }: SystemRuntimePanelProps) {
  const navigate = useNavigate();

  const metrics = [
    {
      label: 'Last Run',
      value: system.lastRun ? formatRelativeTime(system.lastRun.timestamp) : 'Never',
      subvalue: system.lastRun?.channel || '',
      icon: Clock,
      onClick: () => navigate(`/intelligence?tab=monitoring&system=${system.id}`),
    },
    {
      label: 'Success Rate',
      value: `${Math.round(system.successRate)}%`,
      subvalue: 'Last 7 days',
      icon: CheckCircle2,
      onClick: () => navigate(`/intelligence?tab=performance&system=${system.id}`),
    },
    {
      label: 'Avg Duration',
      value: system.avgDuration ? `${system.avgDuration}ms` : '-',
      subvalue: 'Response time',
      icon: Activity,
      onClick: () => navigate(`/intelligence?tab=performance&system=${system.id}`),
    },
    {
      label: 'ROI',
      value: `${system.roi}%`,
      subvalue: 'Current period',
      icon: TrendingUp,
      onClick: () => navigate(`/intelligence?tab=roi&system=${system.id}`),
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
          <div className="flex items-center gap-2 mb-2">
            <metric.icon className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">{metric.label}</p>
          </div>
          <p className="text-2xl font-bold mb-1">{metric.value}</p>
          {metric.subvalue && (
            <p className="text-xs text-muted-foreground">{metric.subvalue}</p>
          )}
          <div className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View details →
          </div>
        </Card>
      ))}
    </div>
  );
}

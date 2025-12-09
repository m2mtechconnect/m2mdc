import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, FileText, Archive, TrendingUp } from 'lucide-react';
import { formatPercentage } from '@/lib/formatters';

interface Stats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  avgRoi: number;
}

interface UnifiedStatsProps {
  stats: Stats;
  onStatClick: (filter: string) => void;
}

export function UnifiedStats({ stats, onStatClick }: UnifiedStatsProps) {
  const statItems = [
    {
      label: 'Total Twins & Agents',
      value: stats.total,
      icon: Brain,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      filter: 'all',
    },
    {
      label: 'Active Twins',
      value: stats.active,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      filter: 'active',
    },
    {
      label: 'Draft Twins',
      value: stats.draft,
      icon: FileText,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      filter: 'draft',
    },
    {
      label: 'Archived Systems',
      value: stats.archived,
      icon: Archive,
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10',
      filter: 'archived',
    },
    {
      label: 'ROI (Avg.)',
      value: formatPercentage(stats.avgRoi, 0),
      icon: TrendingUp,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      filter: '',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {statItems.map((stat) => (
        <Card
          key={stat.label}
          className={`p-4 cursor-pointer transition-smooth hover:scale-[1.02] ${
            stat.filter ? 'hover:shadow-md' : 'cursor-default'
          }`}
          onClick={() => stat.filter && onStatClick(stat.filter)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

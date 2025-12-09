/**
 * Blueprint Summary Card - Compact view for Builder/Dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Bot, Database, Activity, Shield, Play, Download, ExternalLink } from 'lucide-react';
import { useBlueprint } from '@/hooks/useBlueprint';

interface BlueprintSummaryCardProps {
  twinId: string;
  compact?: boolean;
  onViewBlueprint?: () => void;
}

export function BlueprintSummaryCard({ twinId, compact = false, onViewBlueprint }: BlueprintSummaryCardProps) {
  const { summary, downloadBlueprint, isLoading } = useBlueprint(twinId);

  if (isLoading || !summary) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: 'Domains', value: summary.enabledDomains, icon: Database },
    { label: 'Agents', value: summary.totalAgents, icon: Bot },
    { label: 'KPIs', value: summary.totalKpis, icon: Activity },
    { label: 'Workflows', value: summary.enabledWorkflows, icon: Shield },
    { label: 'Scenarios', value: summary.totalScenarios, icon: Play },
  ];

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            System Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {stats.map((stat) => (
              <Badge key={stat.label} variant="secondary" className="text-xs">
                <stat.icon className="h-3 w-3 mr-1" />
                {stat.value} {stat.label}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onViewBlueprint} className="flex-1">
              <ExternalLink className="h-3 w-3 mr-1" />
              View Blueprint
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadBlueprint}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          System Blueprint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/50">
              <stat.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={onViewBlueprint} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Blueprint
          </Button>
          <Button variant="outline" onClick={downloadBlueprint}>
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Blueprint Snapshot Card - Compact summary for Builder Step 1
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Bot, 
  Activity, 
  GitBranch, 
  PlayCircle, 
  ExternalLink,
  Database
} from 'lucide-react';
import { useBlueprint } from '@/hooks/useBlueprint';

interface BlueprintSnapshotCardProps {
  twinId?: string;
  onOpenFullBlueprint?: () => void;
}

export function BlueprintSnapshotCard({ twinId = 'default', onOpenFullBlueprint }: BlueprintSnapshotCardProps) {
  const { summary, isLoading } = useBlueprint(twinId);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4" />
            Blueprint Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Server className="h-4 w-4" />
          Blueprint Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bot className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{summary.totalAgents}</p>
            <p className="text-[10px] text-muted-foreground">Agents</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{summary.totalKpis}</p>
            <p className="text-[10px] text-muted-foreground">KPIs</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <GitBranch className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{summary.totalWorkflows}</p>
            <p className="text-[10px] text-muted-foreground">Workflows</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            <Database className="h-3 w-3 mr-1" />
            {summary.totalDataSources} Sources
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <PlayCircle className="h-3 w-3 mr-1" />
            {summary.totalScenarios} Scenarios
          </Badge>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
          onClick={onOpenFullBlueprint}
        >
          <ExternalLink className="h-3 w-3" />
          Open Full Blueprint
        </Button>
      </CardContent>
    </Card>
  );
}

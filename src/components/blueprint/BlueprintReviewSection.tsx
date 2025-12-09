/**
 * Blueprint Review Section - For Builder Step 5
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
  Users,
  Database,
  Download,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useBlueprint } from '@/hooks/useBlueprint';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface BlueprintReviewSectionProps {
  twinId?: string;
  onOpenBlueprint?: () => void;
}

export function BlueprintReviewSection({ twinId = 'default', onOpenBlueprint }: BlueprintReviewSectionProps) {
  const { blueprint, summary, isLoading, downloadBlueprint } = useBlueprint(twinId);

  if (isLoading || !blueprint || !summary) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="text-base">Blueprint Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { 
      icon: Bot, 
      label: 'Agents', 
      count: summary.totalAgents,
      items: blueprint.agents.slice(0, 5).map(a => a.name)
    },
    { 
      icon: Database, 
      label: 'Data Sources', 
      count: summary.totalDataSources,
      items: blueprint.dataSources.slice(0, 5).map(d => d.name)
    },
    { 
      icon: Activity, 
      label: 'KPIs', 
      count: summary.totalKpis,
      items: blueprint.kpis.slice(0, 5).map(k => k.name)
    },
    { 
      icon: GitBranch, 
      label: 'Workflows', 
      count: summary.totalWorkflows,
      items: blueprint.workflows.slice(0, 5).map(w => w.id)
    },
    { 
      icon: Users, 
      label: 'Human Roles', 
      count: summary.totalRoles,
      items: blueprint.humanRoles.map(r => r.name)
    },
    { 
      icon: PlayCircle, 
      label: 'Scenarios', 
      count: summary.totalScenarios,
      items: blueprint.simulationScenarios.slice(0, 5).map(s => s.name)
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4" />
          Blueprint Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {sections.slice(0, 3).map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.label} className="text-center p-3 rounded-lg bg-muted/50">
                <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{section.count}</p>
                <p className="text-xs text-muted-foreground">{section.label}</p>
              </div>
            );
          })}
        </div>

        {/* Accordion Details */}
        <Accordion type="single" collapsible className="w-full">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <AccordionItem key={section.label} value={section.label}>
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{section.label}</span>
                    <Badge variant="secondary" className="ml-2">{section.count}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pl-6">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {item}
                      </div>
                    ))}
                    {section.count > 5 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        +{section.count - 5} more
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2"
            onClick={onOpenBlueprint}
          >
            <ExternalLink className="h-3 w-3" />
            Open Blueprint
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2"
            onClick={downloadBlueprint}
          >
            <Download className="h-3 w-3" />
            Download JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

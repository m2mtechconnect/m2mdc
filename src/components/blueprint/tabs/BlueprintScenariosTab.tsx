/**
 * Blueprint Scenarios Tab - Simulation scenarios
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  Clock,
  AlertTriangle,
  AlertCircle,
  Activity,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import type { SimulationScenarioBlueprint } from '@/types/dataCentreBlueprint';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface BlueprintScenariosTabProps {
  scenarios: SimulationScenarioBlueprint[];
}

const severityColors: Record<string, string> = {
  warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  critical: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  emergency: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const severityIcons: Record<string, React.ReactNode> = {
  warning: <AlertCircle className="h-4 w-4" />,
  critical: <AlertTriangle className="h-4 w-4" />,
  emergency: <AlertTriangle className="h-4 w-4" />,
};

export function BlueprintScenariosTab({ scenarios }: BlueprintScenariosTabProps) {
  const navigate = useNavigate();

  // Group scenarios by severity
  const scenariosBySeverity = scenarios.reduce((acc, scenario) => {
    const severity = scenario.severity;
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(scenario);
    return acc;
  }, {} as Record<string, SimulationScenarioBlueprint[]>);

  const handleRunScenario = (scenarioId: string) => {
    navigate(`/data-centre-twin?view=simulation&scenarioId=${scenarioId}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4" />
            Simulation Scenarios ({scenarios.length} scenarios)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(scenariosBySeverity).map(([severity, severityScenarios]) => (
              <Badge 
                key={severity} 
                variant="outline" 
                className={`gap-2 ${severityColors[severity] || ''}`}
              >
                {severityIcons[severity]}
                <span className="capitalize">{severity}</span>
                <span className="bg-background/50 px-1.5 rounded">{severityScenarios.length}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{scenario.name}</CardTitle>
                <Badge variant="outline" className={severityColors[scenario.severity] || ''}>
                  {severityIcons[scenario.severity]}
                  <span className="ml-1 capitalize">{scenario.severity}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{scenario.description}</p>

              {/* Duration */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{scenario.durationMinutes} minutes</span>
              </div>

              {/* Domain Impact */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Affected Domains</p>
                <div className="flex flex-wrap gap-1">
                  {scenario.domainImpact.map((domain, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs capitalize">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* KPI Impacts */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  KPI Impacts
                </p>
                <div className="space-y-1">
                  {scenario.kpiImpacts.slice(0, 3).map((impact, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{impact.kpiId}</span>
                      <div className="flex items-center gap-1">
                        {impact.direction === 'increase' ? (
                          <>
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">+{impact.magnitude}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 text-red-500" />
                            <span className="text-red-600">-{impact.magnitude}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {scenario.kpiImpacts.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{scenario.kpiImpacts.length - 3} more impacts
                    </p>
                  )}
                </div>
              </div>

              {/* Mitigation Workflow */}
              {scenario.defaultMitigationWorkflowId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mitigation Workflow</p>
                  <Badge variant="outline" className="text-xs">
                    {scenario.defaultMitigationWorkflowId}
                  </Badge>
                </div>
              )}

              {/* Run Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => handleRunScenario(scenario.id)}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Scenario
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

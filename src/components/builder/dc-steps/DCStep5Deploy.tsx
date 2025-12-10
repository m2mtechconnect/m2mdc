/**
 * DC Builder Step 5: Deployment
 * Includes Financial Assumptions section for customer editing
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useBuilderMode } from '../BuilderModeContext';
import { FinancialAssumptionsCard } from './FinancialAssumptionsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Rocket, MapPin, CheckCircle2, XCircle, Clock, 
  Activity, Download, AlertTriangle, ChevronDown 
} from 'lucide-react';
import { useState } from 'react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function DCStep5Deploy() {
  const { 
    deployment, 
    setTargetRegion, 
    getReadinessScore, 
    isReadyForDeployment, 
    getBlueprintJSON 
  } = useDCTwinBuilderStore();
  const { isArchitectMode } = useBuilderMode();
  const [showAllChecks, setShowAllChecks] = useState(false);

  const readinessScore = getReadinessScore();
  const canDeploy = isReadyForDeployment();
  const passedChecks = deployment.deploymentChecks.filter(c => c.status === 'pass').length;
  const failedChecks = deployment.deploymentChecks.filter(c => c.status === 'fail');

  const handleDownloadBlueprint = () => {
    const blueprint = getBlueprintJSON();
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dc-twin-blueprint-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Review & Deploy</h2>
        <p className="text-sm text-muted-foreground">
          Finalize your twin configuration and deploy to your chosen region.
        </p>
      </div>

      {/* Readiness Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Deployment Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Score</span>
            <span className={`text-2xl font-bold ${readinessScore >= 70 ? 'text-success' : 'text-warning'}`}>
              {readinessScore}%
            </span>
          </div>
          <Progress value={readinessScore} className="h-3" />
          
          {failedChecks.length > 0 && (
            <div className="rounded-lg bg-warning/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {failedChecks.length} check{failedChecks.length > 1 ? 's' : ''} need attention
                </span>
              </div>
              <ul className="text-sm text-warning space-y-1 ml-6">
                {failedChecks.slice(0, 3).map(check => (
                  <li key={check.id}>• {check.name}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Deployment Region
          </CardTitle>
          <CardDescription>
            Choose where your twin will be deployed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={deployment.targetDeploymentRegion} 
            onValueChange={setTargetRegion} 
            className="grid gap-3 md:grid-cols-2"
          >
            {deployment.cloudRegions.map((region) => (
              <div key={region.regionCode} className="flex items-center space-x-2">
                <RadioGroupItem value={region.regionCode} id={region.regionCode} />
                <Label 
                  htmlFor={region.regionCode} 
                  className="flex flex-1 items-center justify-between cursor-pointer rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{region.city}</div>
                    <div className="text-sm text-muted-foreground">
                      {region.provider} • {region.regionCode}
                    </div>
                  </div>
                  <Badge variant="default">Sovereign</Badge>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Financial Assumptions - Customer-editable */}
      <FinancialAssumptionsCard />

      {/* Deployment Checks - Collapsed by default in Quick Edit */}
      <Card>
        <Collapsible open={isArchitectMode || showAllChecks}>
          <CardHeader className="cursor-pointer" onClick={() => setShowAllChecks(!showAllChecks)}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Deployment Checks
                <Badge variant="outline" className="ml-2">
                  {passedChecks}/{deployment.deploymentChecks.length} passed
                </Badge>
              </CardTitle>
              {!isArchitectMode && (
                <CollapsibleTrigger asChild>
                  <ChevronDown className={`h-5 w-5 transition-transform ${showAllChecks ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              {deployment.deploymentChecks.map((check) => (
                <div 
                  key={check.id} 
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[check.status]}
                    <span className="font-medium">{check.name}</span>
                    <Badge variant="outline" className="text-xs">{check.category}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {isArchitectMode && (
          <Button variant="outline" onClick={handleDownloadBlueprint} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download Blueprint JSON
          </Button>
        )}
        <Button disabled={!canDeploy} className="flex-1">
          <Rocket className="h-4 w-4 mr-2" />
          Deploy Twin
        </Button>
      </div>

      {!canDeploy && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            Readiness score must be at least 70% to deploy. Review the checks above.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * DC Builder Step 5: Review and activate the twin record.
 * Infrastructure provisioning is intentionally separate from this action.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useBuilderMode } from '../BuilderModeContext';
import { useTwinPersistence } from '@/hooks/useTwinPersistence';
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
  Activity, Download, AlertTriangle, ChevronDown, Loader2
} from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function DCStep5Deploy() {
  const navigate = useNavigate();
  const {
    deployment,
    setTargetRegion,
    getReadinessScore,
    isReadyForDeployment,
    getBlueprintJSON,
    updateOverview,
    updateDeployment,
  } = useDCTwinBuilderStore();
  const { isArchitectMode } = useBuilderMode();
  const { saveTwinToDatabase, isSaving } = useTwinPersistence();
  const [showAllChecks, setShowAllChecks] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

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

  const handleDeploy = async () => {
    if (!canDeploy) {
      toast.error('Please complete all required configuration before activating the twin');
      return;
    }

    setIsDeploying(true);
    try {
      const builderState = useDCTwinBuilderStore.getState();
      const existingTwinId = builderState.overview.deployedTwinId;
      const twinId = await saveTwinToDatabase(builderState, existingTwinId);

      if (twinId) {
        updateOverview({
          deployedTwinId: twinId,
          updatedAt: new Date().toISOString(),
        });
        updateDeployment({
          deployedTwinId: twinId,
          deployedAt: new Date().toISOString(),
        });

        toast.success('Data Centre Twin activated successfully');

        setTimeout(() => {
          navigate(`/data-centre-twin?twinId=${twinId}`);
        }, 1000);
      } else {
        toast.error('The twin could not be saved. No activation record was created. Please try again.');
      }
    } catch (error) {
      console.error('Twin activation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate twin');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Review &amp; Activate</h2>
        <p className="text-sm text-muted-foreground">
          Finalize the twin configuration, record the preferred data region, and activate the twin. This action does not provision cloud infrastructure.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Twin Readiness
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

      <Card data-tour="blueprint-deploy">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Twin Data Region
          </CardTitle>
          <CardDescription>
            Select the preferred region metadata for this twin. Infrastructure placement is configured separately.
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
                  <Badge variant="outline">Region preference</Badge>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <FinancialAssumptionsCard />

      <Card>
        <Collapsible open={isArchitectMode || showAllChecks}>
          <CardHeader className="cursor-pointer" onClick={() => setShowAllChecks(!showAllChecks)}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Activation Checks
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

      <div className="flex flex-col gap-3 sm:flex-row">
        {isArchitectMode && (
          <Button variant="outline" onClick={handleDownloadBlueprint} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download Blueprint JSON
          </Button>
        )}
        <Button
          disabled={!canDeploy || isDeploying || isSaving}
          onClick={handleDeploy}
          className="flex-1"
        >
          {isDeploying || isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4 mr-2" />
          )}
          {isDeploying ? 'Activating...' : 'Save & Activate Twin'}
        </Button>
      </div>

      {!canDeploy && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            Readiness score must be at least 70% to activate the twin. Review the checks above.
          </span>
        </div>
      )}
    </div>
  );
}

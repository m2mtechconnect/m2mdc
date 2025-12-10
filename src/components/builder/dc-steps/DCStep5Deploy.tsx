/**
 * DC Builder Step 5: Deployment
 */

import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Rocket, MapPin, CheckCircle2, XCircle, Clock, Shield, Zap, Activity, Download, AlertTriangle } from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function DCStep5Deploy() {
  const { deployment, setTargetRegion, getReadinessScore, isReadyForDeployment, getBlueprintJSON } = useDCTwinBuilderStore();

  const readinessScore = getReadinessScore();
  const canDeploy = isReadyForDeployment();
  const passedChecks = deployment.deploymentChecks.filter(c => c.status === 'pass').length;

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
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Deployment Readiness</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Readiness Score</span>
            <span className={`font-bold ${readinessScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{readinessScore}%</span>
          </div>
          <Progress value={readinessScore} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Target Region</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={deployment.targetDeploymentRegion} onValueChange={setTargetRegion} className="grid gap-3 md:grid-cols-2">
            {deployment.cloudRegions.map((region) => (
              <div key={region.regionCode} className="flex items-center space-x-2">
                <RadioGroupItem value={region.regionCode} id={region.regionCode} />
                <Label htmlFor={region.regionCode} className="flex flex-1 items-center justify-between cursor-pointer rounded-lg border p-3 hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{region.city}</div>
                    <div className="text-sm text-muted-foreground">{region.provider} - {region.regionCode}</div>
                  </div>
                  <Badge variant="default">Sovereign</Badge>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Checks ({passedChecks}/{deployment.deploymentChecks.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {deployment.deploymentChecks.map((check) => (
            <div key={check.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <span className="font-medium">{check.name}</span>
                <Badge variant="outline" className="text-xs">{check.category}</Badge>
              </div>
              {STATUS_ICONS[check.status]}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={handleDownloadBlueprint} className="flex-1"><Download className="h-4 w-4 mr-2" />Download Blueprint</Button>
        <Button disabled={!canDeploy} className="flex-1"><Rocket className="h-4 w-4 mr-2" />Deploy Twin</Button>
      </div>

      {!canDeploy && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Readiness score must be at least 70% to deploy.</span>
        </div>
      )}
    </div>
  );
}

/**
 * DC Twin Deploy Tab
 * Shows deployment configuration, cloud regions, and readiness checks
 * 
 * CRITICAL: Uses useTwinContext() to prioritize active twin over builder store
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud, CheckCircle2, XCircle, AlertCircle, Server, Globe,
  Shield, Database, GitBranch, BarChart3, Lock, Rocket
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { useTwinContext } from '@/hooks/useTwinContext';

const categoryIcons: Record<string, React.ReactNode> = {
  sovereignty: <Shield className="h-4 w-4" />,
  telemetry: <Database className="h-4 w-4" />,
  workflows: <GitBranch className="h-4 w-4" />,
  kpis: <BarChart3 className="h-4 w-4" />,
  security: <Lock className="h-4 w-4" />,
};

const providerLogos: Record<string, string> = {
  aws: '🔶',
  azure: '🔷',
  gcp: '🔴',
};

export function DCDeployTab() {
  const { activeTwin } = useTwinContext();
  const { overview: builderOverview, deployment, setTargetRegion } = useDCTwinBuilderStore();
  
  // CRITICAL: Use active twin data if available
  const overview = {
    ...builderOverview,
    twinName: activeTwin?.name || builderOverview.twinName,
    facilityLocation: activeTwin?.city || builderOverview.facilityLocation,
    regionCode: activeTwin?.region_code || builderOverview.regionCode,
  };
  
  const passedChecks = deployment.deploymentChecks.filter(c => c.status === 'pass').length;
  const totalChecks = deployment.deploymentChecks.length;
  const readinessPercent = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  
  const completedSteps = deployment.orchestratorSteps.filter(s => s.status === 'completed').length;
  
  return (
    <div className="space-y-6">
      {/* Readiness Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Deployment Readiness</h2>
              <p className="text-sm text-muted-foreground">
                {passedChecks} of {totalChecks} checks passed
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{readinessPercent}%</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </div>
          </div>
          <Progress value={readinessPercent} className="h-2" />
        </CardContent>
      </Card>
      
      {/* Cloud Regions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Canadian Cloud Regions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {deployment.cloudRegions.map((region) => (
              <button
                key={region.regionCode}
                onClick={() => setTargetRegion(region.regionCode)}
                className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
                  deployment.targetDeploymentRegion === region.regionCode
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{providerLogos[region.provider]}</span>
                  <div>
                    <p className="font-semibold">{region.provider.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{region.regionCode}</p>
                  </div>
                </div>
                
                <p className="text-sm font-medium mb-1">{region.city}</p>
                <p className="text-xs text-muted-foreground mb-3">{region.sovereigntyNotes}</p>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recommended Services</p>
                  <div className="flex flex-wrap gap-1">
                    {region.recommendedServices.slice(0, 3).map((svc, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px]">{svc}</Badge>
                    ))}
                    {region.recommendedServices.length > 3 && (
                      <Badge variant="secondary" className="text-[9px]">+{region.recommendedServices.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Deployment Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Sovereign Deployment Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {deployment.deploymentChecks.map((check) => (
              <div 
                key={check.id}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  check.status === 'pass' ? 'bg-success/5 border-success/30' :
                  check.status === 'fail' ? 'bg-destructive/5 border-destructive/30' :
                  'bg-muted/50'
                }`}
              >
                <div className="mt-0.5">
                  {check.status === 'pass' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : check.status === 'fail' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {categoryIcons[check.category]}
                    <span className="font-medium text-sm">{check.name}</span>
                  </div>
                  {check.message && (
                    <p className="text-xs text-muted-foreground mt-1">{check.message}</p>
                  )}
                  {check.requiresConfigAction && check.status !== 'pass' && (
                    <Badge variant="outline" className="mt-2 text-[10px]">Action Required</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Orchestrator Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Sovereign Deployment Orchestrator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deployment.orchestratorSteps.map((step) => (
              <div 
                key={step.step}
                className={`p-4 rounded-lg border ${
                  step.status === 'completed' ? 'bg-success/5 border-success/30' :
                  step.status === 'in_progress' ? 'bg-primary/5 border-primary/30' :
                  step.status === 'failed' ? 'bg-destructive/5 border-destructive/30' :
                  'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    step.status === 'completed' ? 'bg-success text-success-foreground' :
                    step.status === 'in_progress' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step.step}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge variant={
                    step.status === 'completed' ? 'default' :
                    step.status === 'in_progress' ? 'secondary' :
                    step.status === 'failed' ? 'destructive' : 'outline'
                  }>
                    {step.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                {step.tasks.length > 0 && (
                  <div className="ml-11 mt-2 space-y-1">
                    {step.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className={`h-3 w-3 ${step.status === 'completed' ? 'text-success' : ''}`} />
                        {task}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline">Save Draft</Button>
            <Button 
              className="gap-2"
              disabled={readinessPercent < 100}
            >
              <Rocket className="h-4 w-4" />
              Deploy to {deployment.targetDeploymentRegion || 'Selected Region'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

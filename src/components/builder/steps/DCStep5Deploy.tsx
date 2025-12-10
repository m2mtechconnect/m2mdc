/**
 * DC Twin Builder Step 5 - Deployment
 * Canadian cloud regions, sovereignty checks, and deployment orchestration
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, Cloud, Shield, Server, Check, AlertTriangle, 
  MapPin, Zap, Loader2, Download, CheckCircle2 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';

const PROVIDER_ICONS: Record<string, string> = {
  AWS: '🟧',
  Azure: '🔷',
  GCP: '🟢',
};

export function DCStep5Deploy() {
  const navigate = useNavigate();
  const { 
    deployment,
    overview,
    agents,
    dataSources,
    kpis,
    scenarios,
    setTargetRegion,
    updateDeploymentCheckStatus,
    updateOrchestratorStepStatus,
    getReadinessScore,
    isReadyForDeployment,
    getBlueprintJSON,
    markStepComplete,
  } = useDCTwinBuilderStore();
  
  const [activeTab, setActiveTab] = useState('regions');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);

  const readinessScore = getReadinessScore();
  const canDeploy = isReadyForDeployment();
  
  const passedChecks = deployment.deploymentChecks.filter(c => c.status === 'pass').length;
  const totalChecks = deployment.deploymentChecks.length;

  const handleSelectRegion = (regionCode: string) => {
    setTargetRegion(regionCode);
    // Update the region check
    updateDeploymentCheckStatus('check-region-selected', 'pass');
    toast.success(`Target region set to ${regionCode}`);
  };

  const handleDownloadBlueprint = () => {
    const blueprint = getBlueprintJSON();
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${overview.twinSlug || 'dc-twin'}-blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Blueprint downloaded');
  };

  const handleDeploy = async () => {
    if (!canDeploy) {
      toast.error('Please complete all required configuration before deploying');
      return;
    }

    setIsDeploying(true);
    
    // Simulate deployment steps
    for (let i = 1; i <= deployment.orchestratorSteps.length; i++) {
      setDeploymentStep(i);
      updateOrchestratorStepStatus(i, 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateOrchestratorStepStatus(i, 'completed');
    }

    markStepComplete(5);
    toast.success('Data Centre Twin deployed successfully!');
    setIsDeploying(false);
    
    // Navigate to the twin dashboard
    setTimeout(() => {
      navigate('/data-centre-twin');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title="Deployment Configuration"
        subtitle="Select cloud region and deploy your Sovereign Green AI Data Centre Twin"
        icon={<Rocket className="h-5 w-5" />}
      />

      {/* Readiness Stats */}
      <div className="grid gap-4 grid-cols-4">
        <DCKPITile
          label="Readiness"
          value={`${readinessScore}%`}
          status={readinessScore >= 80 ? 'normal' : readinessScore >= 50 ? 'warning' : 'critical'}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <DCKPITile
          label="Checks Passed"
          value={`${passedChecks}/${totalChecks}`}
          status={passedChecks >= totalChecks - 2 ? 'normal' : 'warning'}
          icon={<Shield className="h-4 w-4" />}
        />
        <DCKPITile
          label="Target Region"
          value={deployment.targetDeploymentRegion || 'Not Set'}
          status={deployment.targetDeploymentRegion ? 'normal' : 'warning'}
          icon={<MapPin className="h-4 w-4" />}
        />
        <DCKPITile
          label="Agents"
          value={String(agents.filter(a => a.enabled).length)}
          sublabel="enabled"
          status="info"
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Cloud Regions
          </TabsTrigger>
          <TabsTrigger value="checks" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Readiness Checks
          </TabsTrigger>
          <TabsTrigger value="orchestrator" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Orchestrator
          </TabsTrigger>
        </TabsList>

        {/* Cloud Regions Tab */}
        <TabsContent value="regions" className="space-y-4 mt-4">
          <DCCard 
            title="Canadian Cloud Regions" 
            subtitle="Select a sovereign deployment region"
            icon={<Cloud className="h-4 w-4" />}
          >
            <RadioGroup 
              value={deployment.targetDeploymentRegion} 
              onValueChange={handleSelectRegion}
              className="space-y-3"
            >
              {deployment.cloudRegions.map((region) => (
                <div 
                  key={region.regionCode}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                    deployment.targetDeploymentRegion === region.regionCode
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/50 border-border hover:border-primary/20'
                  }`}
                  onClick={() => handleSelectRegion(region.regionCode)}
                >
                  <RadioGroupItem value={region.regionCode} id={region.regionCode} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PROVIDER_ICONS[region.provider]}</span>
                      <Label htmlFor={region.regionCode} className="font-medium cursor-pointer">
                        {region.provider} - {region.city}
                      </Label>
                      <Badge variant="outline" className="text-xs">{region.regionCode}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{region.sovereigntyNotes}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {region.recommendedServices.slice(0, 4).map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{service}</Badge>
                      ))}
                      {region.recommendedServices.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{region.recommendedServices.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </DCCard>
        </TabsContent>

        {/* Readiness Checks Tab */}
        <TabsContent value="checks" className="space-y-4 mt-4">
          <DCCard 
            title="Sovereign Deployment Readiness" 
            subtitle={`${passedChecks} of ${totalChecks} checks passed`}
            icon={<Shield className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {deployment.deploymentChecks.map((check) => {
                const statusConfig = {
                  pass: { icon: Check, color: 'text-success', bg: 'bg-success/10' },
                  fail: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
                  pending: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
                };
                const config = statusConfig[check.status];
                const StatusIcon = config.icon;

                return (
                  <div 
                    key={check.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      check.status === 'pass' ? 'border-success/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{check.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">{check.category}</Badge>
                      </div>
                    </div>
                    <Badge className={check.status === 'pass' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                      {check.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </DCCard>
        </TabsContent>

        {/* Orchestrator Tab */}
        <TabsContent value="orchestrator" className="space-y-4 mt-4">
          <DCCard 
            title="Deployment Orchestrator" 
            subtitle="Step-by-step deployment workflow"
            icon={<Server className="h-4 w-4" />}
          >
            <div className="space-y-4">
              {deployment.orchestratorSteps.map((step) => {
                const isCompleted = step.status === 'completed';
                const isInProgress = step.status === 'in_progress';
                const isCurrent = deploymentStep === step.step;

                return (
                  <div 
                    key={step.step}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      isCompleted ? 'border-success/30 bg-success/5' : 
                      isInProgress ? 'border-primary/30 bg-primary/5' : 
                      'border-border'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? 'bg-success text-success-foreground' :
                      isInProgress ? 'bg-primary text-primary-foreground' :
                      'bg-muted'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : isInProgress ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-sm font-mono">{step.step}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{step.name}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {step.tasks.map((task, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{task}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isDeploying && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Deployment Progress</span>
                    <span>{Math.round((deploymentStep / deployment.orchestratorSteps.length) * 100)}%</span>
                  </div>
                  <Progress value={(deploymentStep / deployment.orchestratorSteps.length) * 100} />
                </div>
              )}
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>

      {/* Deploy Actions */}
      <DCCard className="bg-muted/30">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ready to Deploy?</p>
              <p className="text-xs text-muted-foreground">
                {canDeploy 
                  ? 'All checks passed. Your Data Centre Twin is ready for deployment.'
                  : 'Complete the configuration above before deploying.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadBlueprint}>
                <Download className="h-4 w-4 mr-2" />
                Download Blueprint
              </Button>
              <Button 
                onClick={handleDeploy} 
                disabled={!canDeploy || isDeploying}
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Twin
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DCCard>
    </div>
  );
}

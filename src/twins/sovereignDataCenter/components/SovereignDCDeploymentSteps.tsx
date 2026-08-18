/**
 * Sovereign DC Twin - Deployment Steps
 * Twin-specific deployment workflow emphasizing sovereignty, emissions, and capacity
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Settings, Plug, CheckCircle2, Cloud, Rocket, 
  Loader2, Sparkles, ChevronDown, Shield, Leaf,
  Activity, Database, AlertTriangle, Zap
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { sovereignDCAnalytics } from '../analytics';

interface SovereignDCDeploymentStepsProps {
  template: any;
  isDeploying?: boolean;
  onDeploy?: () => void;
}

export function SovereignDCDeploymentSteps({ 
  template, 
  isDeploying = false,
  onDeploy 
}: SovereignDCDeploymentStepsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCloud, setSelectedCloud] = useState<string>('aws');
  const [deploymentStarted, setDeploymentStarted] = useState(false);
  const [deploymentPhase, setDeploymentPhase] = useState<string>('');
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const navigate = useNavigate();
  
  const config = template?.default_config || {};
  const cloudMetadata = config.cloud_metadata || {};
  
  // Canadian-only cloud providers with twin-specific services
  const cloudProviders = [
    {
      id: 'aws',
      name: 'AWS Canada (ca-central-1)',
      emoji: '🟧',
      enabled: cloudMetadata.aws?.enabled,
      region: 'Montreal',
      sovereignNote: 'PIPEDA compliant, Canadian data residency guaranteed',
      services: cloudMetadata.aws?.twin_services || [
        'Kinesis for GPU/DCIM telemetry ingestion',
        'SageMaker for PUE optimization models',
        'S3 (ca-central-1) for sovereign data storage',
        'QuickSight dashboards for KPI visualization'
      ]
    },
    {
      id: 'azure',
      name: 'Azure Canada Central',
      emoji: '🔵',
      enabled: cloudMetadata.azure?.enabled,
      region: 'Toronto',
      sovereignNote: 'Azure Government-grade compliance, Canadian data sovereignty',
      services: cloudMetadata.azure?.twin_services || [
        'Event Hubs for real-time telemetry',
        'Azure ML for emissions optimization',
        'Blob Storage (canadacentral) for sovereign data',
        'Power BI for operational dashboards'
      ]
    },
    {
      id: 'gcp',
      name: 'GCP Montreal (northamerica-northeast1)',
      emoji: '🟢',
      enabled: cloudMetadata.gcp?.enabled,
      region: 'Montreal',
      sovereignNote: 'Google Cloud Canada, data never leaves Canadian jurisdiction',
      services: cloudMetadata.gcp?.twin_services || [
        'Pub/Sub for GPU & energy telemetry',
        'Vertex AI for carbon intensity forecasting',
        'Cloud Storage (northamerica-northeast1) for sovereign data',
        'Looker Studio for KPI dashboards'
      ]
    }
  ].filter(p => p.enabled);
  
  const handleDeploy = async () => {
    setDeploymentStarted(true);
    
    // Track analytics
    sovereignDCAnalytics.templateViewed(template.id);
    
    try {
      // Phase 9: no scripted phase animation. The only progress reported is
      // the single real operation this component performs.
      setDeploymentPhase('Recording deployment request...');

      if (onDeploy) {
        await onDeploy();
      }

      // No post-deploy smoke test is executed here, so none is claimed.
      setDeploymentComplete(true);
      setDeploymentPhase('');

      toast.success('Deployment request recorded', {
        description: 'Review the deployment record and its step log under Runtime Environments.'
      });
      
      // Track completion
      sovereignDCAnalytics.simulationRun(template.id, 'deployment', 'deploy_complete');

      navigate('/deployments');

    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed', {
        description: 'Please verify sovereignty configuration and try again.'
      });
      setDeploymentStarted(false);
      setDeploymentPhase('');
    }
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">Sovereign Deployment Orchestrator</h3>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Canadian Regions Only
            </Badge>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-6">
          <div className="space-y-6">
            {/* Step 1 - Sovereignty & Intelligence */}
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Step 1 — Validate Sovereignty Configuration</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Ensures all data flows remain within Canadian jurisdiction. Validates PIPEDA compliance and provincial data residency requirements.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    PIPEDA Compliant
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Canadian Data Residency
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Step 2 - Telemetry Ingestion */}
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Step 2 — Connect Telemetry Sources</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Establish connections to GPU cluster metrics, DCIM sensors, energy providers, and carbon intensity feeds.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">GPU/HPC Metrics</Badge>
                  <Badge variant="outline" className="text-xs">DCIM Telemetry</Badge>
                  <Badge variant="outline" className="text-xs">Energy Feeds</Badge>
                  <Badge variant="outline" className="text-xs">Carbon Intensity API</Badge>
                </div>
              </div>
            </div>
            
            {/* Step 3 - AI/ML Models */}
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Step 3 — Deploy Optimization Models</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Deploy AI models for PUE optimization, emissions forecasting, capacity planning, and risk assessment.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    PUE Optimizer
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Leaf className="h-3 w-3 mr-1" />
                    Emissions Forecaster
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Capacity Planner
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Step 4 - Workflows */}
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Step 4 — Activate Operational Workflows</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Enable automated workflows for GPU saturation alerts, PUE spikes, sovereignty violations, and carbon price shocks.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    GPU Saturation Alert
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Cooling Emergency
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-primary" />
                    Sovereignty Violation
                  </div>
                  <div className="flex items-center gap-1">
                    <Leaf className="h-3 w-3 text-green-500" />
                    Carbon Price Alert
                  </div>
                </div>
              </div>
            </div>
            
            {/* Step 5 - Select Cloud */}
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Step 5 — Select Canadian Cloud Region</h4>
                <RadioGroup value={selectedCloud} onValueChange={setSelectedCloud}>
                  <div className="space-y-3">
                    {cloudProviders.map((provider) => (
                      <div 
                        key={provider.id} 
                        className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={provider.id} id={provider.id} className="mt-1" />
                          <Label htmlFor={provider.id} className="cursor-pointer flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{provider.emoji}</span>
                              <span className="font-medium">{provider.name}</span>
                              <Badge variant="outline" className="text-xs">{provider.region}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{provider.sovereignNote}</p>
                            <div className="space-y-1">
                              {provider.services.map((service, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="text-primary">•</span> {service}
                                </p>
                              ))}
                            </div>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {/* Step 6 - Deploy with Smoke Test */}
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <Rocket className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Step 6 — Deploy & Validate</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Records the deployment request and its step log. Automated post-deploy verification of telemetry, KPI updates and the simulation engine is not implemented, so no verification result is reported here.
                </p>
                
                {deploymentPhase && (
                  <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-muted-foreground">{deploymentPhase}</span>
                    </div>
                  </div>
                )}
                
                {deploymentComplete && (
                  <div className="mb-3 p-3 rounded-lg border border-border bg-muted/50" role="status">
                    <p className="text-sm text-muted-foreground">
                      Deployment recorded. Post-deploy verification: not run.
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || deploymentStarted}
                  className="w-full"
                  size="lg"
                >
                  {deploymentComplete ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Sovereign Twin Deployed!
                    </>
                  ) : deploymentStarted ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-5 w-5" />
                      Deploy to {cloudProviders.find(p => p.id === selectedCloud)?.name || 'Canadian Cloud'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
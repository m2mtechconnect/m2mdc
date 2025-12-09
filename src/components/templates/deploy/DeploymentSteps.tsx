import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Settings, Plug, CheckCircle2, Cloud, Rocket, 
  Loader2, Sparkles, ChevronDown 
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DeploymentStepsProps {
  template: any;
  isDeploying?: boolean;
  onDeploy?: () => void;
}

export function DeploymentSteps({ 
  template, 
  isDeploying = false,
  onDeploy 
}: DeploymentStepsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCloud, setSelectedCloud] = useState<string>('aws');
  const [deploymentStarted, setDeploymentStarted] = useState(false);
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const navigate = useNavigate();
  
  const config = template.default_config || {};
  const blueprintJson = config.blueprint_json || {};
  const cloudMetadata = config.cloud_metadata || {};
  
  const handleDeploy = async () => {
    setDeploymentStarted(true);
    
    // Fire analytics event
    console.log('Analytics event: deployment_started', {
      templateId: template.id,
      templateName: template.name,
      cloudProvider: selectedCloud
    });
    
    // Simulate deployment (replace with actual edge function call)
    try {
      if (onDeploy) {
        await onDeploy();
      } else {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setDeploymentComplete(true);
      toast.success('Successfully deployed!');
      
      // Fire analytics event
      console.log('Analytics event: deployment_completed', {
        templateId: template.id,
        templateName: template.name,
        cloudProvider: selectedCloud
      });
      
      // Redirect to Dashboard → Deployed Agents tab after 1 second
      setTimeout(() => {
        navigate('/dashboard?tab=deployed');
      }, 1000);
      
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed. Please try again.');
      setDeploymentStarted(false);
    }
  };
  
  const cloudProviders = [
    {
      id: 'aws',
      name: 'AWS',
      emoji: '🟧',
      enabled: cloudMetadata.aws?.enabled
    },
    {
      id: 'azure',
      name: 'Azure',
      emoji: '🔵',
      enabled: cloudMetadata.azure?.enabled
    },
    {
      id: 'gcp',
      name: 'GCP',
      emoji: '🟢',
      enabled: cloudMetadata.gcp?.enabled
    }
  ].filter(p => p.enabled);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <h3 className="text-xl font-semibold">One-Click Deployment Steps</h3>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-6">
          <div className="space-y-6">
        {/* Step 1 - Configure Intelligence */}
        <div className="flex gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Step 1 — Configure Intelligence</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Configure model settings, temperature, and prompt templates.
            </p>
            {config.model_config?.model && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {config.model_config.model}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Step 2 - Connect Integrations */}
        <div className="flex gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
            <Plug className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Step 2 — Connect Integrations</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Connect required integrations and data sources.
            </p>
            {blueprintJson.integrations && blueprintJson.integrations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blueprintJson.integrations.slice(0, 3).map((integration: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {integration.name}
                  </Badge>
                ))}
                {blueprintJson.integrations.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{blueprintJson.integrations.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Step 3 - Validate Workflows */}
        <div className="flex gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Step 3 — Validate Workflows</h4>
            <p className="text-sm text-muted-foreground">
              Ensure all workflows have valid triggers, conditions, and actions.
            </p>
          </div>
        </div>
        
        {/* Step 4 - Select Cloud */}
        <div className="flex gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-2">Step 4 — Select Cloud Provider</h4>
            <RadioGroup value={selectedCloud} onValueChange={setSelectedCloud}>
              <div className="space-y-2">
                {cloudProviders.map((provider) => (
                  <div key={provider.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={provider.id} id={provider.id} />
                    <Label htmlFor={provider.id} className="flex items-center gap-2 cursor-pointer flex-1">
                      <span className="text-xl">{provider.emoji}</span>
                      <span className="font-medium">{provider.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {/* Step 5 - Deploy */}
        <div className="flex gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-2">Step 5 — Deploy</h4>
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || deploymentStarted}
              className="w-full"
              size="lg"
            >
              {deploymentComplete ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Successfully Deployed!
                </>
              ) : deploymentStarted ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" />
                  Deploy to {cloudProviders.find(p => p.id === selectedCloud)?.name || 'Cloud'}
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

/**
 * Deployment Progress Modal
 * Animated deployment progress with status steps
 * Shows real-time deployment status and auto-redirects on success
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, AlertCircle, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackDeployment } from '@/lib/analytics/analyticsService';

interface DeploymentStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
}

interface DeploymentProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  onDeploy: () => Promise<{ success: boolean; agentUrl?: string; message?: string }>;
}

export function DeploymentProgressModal({
  open,
  onOpenChange,
  agentName,
  onDeploy,
}: DeploymentProgressModalProps) {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<DeploymentStep[]>([
    { id: 'validate', label: 'Validating Blueprint', status: 'pending' },
    { id: 'provision', label: 'Provisioning Agent Runtime', status: 'pending' },
    { id: 'register', label: 'Registering Integrations', status: 'pending' },
    { id: 'generate', label: 'Generating API Key & Endpoint', status: 'pending' },
    { id: 'deploy', label: 'Deploying to Workspace', status: 'pending' },
  ]);
  const [overallStatus, setOverallStatus] = useState<'deploying' | 'success' | 'error'>('deploying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      startDeployment();
    }
  }, [open]);

  const updateStep = (stepId: string, status: DeploymentStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const startDeployment = async () => {
    try {
      // Step 1: Validate
      setProgress(10);
      updateStep('validate', 'in-progress');
      await delay(800);
      updateStep('validate', 'complete');

      // Step 2: Provision
      setProgress(30);
      updateStep('provision', 'in-progress');
      await delay(1200);
      updateStep('provision', 'complete');

      // Step 3: Register
      setProgress(50);
      updateStep('register', 'in-progress');
      await delay(1000);
      updateStep('register', 'complete');

      // Step 4: Generate
      setProgress(70);
      updateStep('generate', 'in-progress');
      
      // Actual deployment call
      const result = await onDeploy();
      
      if (!result.success) {
        throw new Error(result.message || 'Deployment failed');
      }

      updateStep('generate', 'complete');

      // Step 5: Deploy
      setProgress(90);
      updateStep('deploy', 'in-progress');
      await delay(800);
      updateStep('deploy', 'complete');

      // Success!
      setProgress(100);
      setOverallStatus('success');
      setAgentUrl(result.agentUrl || '/dashboard');

      // Track successful deployment
      trackDeployment('deployed', true);

      // Auto-redirect after 2.5 seconds
      setTimeout(() => {
        navigate('/dashboard');
        onOpenChange(false);
      }, 2500);

    } catch (error) {
      console.error('[Deployment] Error:', error);
      setOverallStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Deployment failed';
      setErrorMessage(errorMsg);
      
      // Track failed deployment
      trackDeployment('unknown', false, errorMsg);
      
      // Mark current in-progress step as error
      setSteps(prev => prev.map(step => 
        step.status === 'in-progress' ? { ...step, status: 'error' } : step
      ));
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getStepIcon = (status: DeploymentStep['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {overallStatus === 'deploying' && <Rocket className="h-8 w-8 text-primary animate-bounce" />}
              {overallStatus === 'success' && <CheckCircle2 className="h-8 w-8 text-primary" />}
              {overallStatus === 'error' && <AlertCircle className="h-8 w-8 text-destructive" />}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {overallStatus === 'deploying' && 'Deploying Agent'}
              {overallStatus === 'success' && 'Deployment Successful!'}
              {overallStatus === 'error' && 'Deployment Failed'}
            </h2>
            <p className="text-muted-foreground">
              {overallStatus === 'deploying' && `Deploying ${agentName} to production...`}
              {overallStatus === 'success' && 'Your agent is now live and ready to use'}
              {overallStatus === 'error' && errorMessage}
            </p>
          </div>

          {/* Progress Bar */}
          <Progress value={progress} className="h-2" />

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {getStepIcon(step.status)}
                <span className={`flex-1 ${
                  step.status === 'complete' ? 'text-muted-foreground line-through' :
                  step.status === 'in-progress' ? 'font-medium' :
                  step.status === 'error' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {overallStatus === 'success' && (
            <div className="pt-4 border-t">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {overallStatus === 'error' && (
            <div className="pt-4 border-t flex gap-2">
              <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
                Close
              </Button>
              <Button onClick={() => {
                setOverallStatus('deploying');
                setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
                setProgress(0);
                startDeployment();
              }} className="flex-1">
                Retry
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

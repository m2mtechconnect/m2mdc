import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Edit2, AlertTriangle } from 'lucide-react';
import { validateBuilderForDeploy, ValidationResult } from '@/lib/validation/builderValidation';

export function Step6Review() {
  const { 
    goal, 
    industry, 
    department, 
    type, 
    template, 
    workflow, 
    modelConfig,
    deployBuilder,
    setCurrentStep,
    error
  } = useWizardBuilderStore();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{
    success: boolean;
    agentUrl?: string;
    message?: string;
  } | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });
  const navigate = useNavigate();

  // Validate on mount and when state changes
  useEffect(() => {
    const state = {
      goal,
      industry,
      department,
      type,
      template,
      workflow,
      modelConfig,
    };
    const result = validateBuilderForDeploy(state);
    setValidation(result);
  }, [goal, industry, department, type, template, workflow, modelConfig]);

  const handleDeploy = async () => {
    // Re-validate before deploy
    const state = {
      goal,
      industry,
      department,
      type,
      template,
      workflow,
      modelConfig,
    };
    const result = validateBuilderForDeploy(state);
    
    if (!result.isValid) {
      setDeploymentError('Please complete all required fields before deploying');
      setValidation(result);
      
      // Scroll to error banner
      setTimeout(() => {
        const errorBanner = document.getElementById('deploy-error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      return;
    }

    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentResult(null);

    try {
      const result = await deployBuilder();
      setDeploymentResult(result);

      if (result.success) {
        setTimeout(() => {
          if (result.agentUrl) {
            navigate(result.agentUrl);
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      } else {
        setDeploymentError(result.message || 'Deployment failed. Check configuration.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deploy';
      setDeploymentError(message);
      setDeploymentResult({ success: false, message });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleFixField = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="space-y-6 max-w-[880px] mx-auto">
      <div>
        <h2 className="text-3xl font-bold">Review & Deploy</h2>
        <p className="text-muted-foreground mt-2">
          Verify all fields before deployment
        </p>
      </div>

      {/* Goal Summary */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{goal || 'No goal specified'}</p>
        </CardContent>
      </Card>

      {/* Validation Error Banner */}
      {!validation.isValid && !deploymentResult && (
        <Card id="deploy-error-banner" className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cannot Deploy - Required Fields Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/90 mb-4">
              Complete the following fields before deployment:
            </p>
            <ul className="space-y-2">
              {validation.errors.map((error) => (
                <li key={error.field} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-destructive/90">• {error.label}: {error.message}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFixField(error.step)}
                    className="text-xs h-7 border-destructive/30 hover:bg-destructive/20"
                  >
                    Fix on Step {error.step}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {validation.isValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Ready to Deploy
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Not Ready
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {validation.isValid 
              ? 'All required fields verified' 
              : `${validation.errors.length} field${validation.errors.length !== 1 ? 's' : ''} missing`
            }
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Industry & Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Industry & Department
              {industry && industry !== 'Not selected' && department ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {industry && industry !== 'Not selected' && department ? (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{industry}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="secondary">{department}</Badge>
              </div>
            ) : (
              <p className="text-sm text-destructive">Required: Not selected</p>
            )}
          </CardContent>
        </Card>

        {/* Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Type
              {type ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="capitalize">
              {type?.replace('_', ' ') || 'Not set'}
            </Badge>
          </CardContent>
        </Card>

        {/* Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Workflow
              {workflow?.actions?.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Actions:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {workflow?.actions?.length > 0 ? (
                  workflow.actions.map((action, idx) => (
                    <Badge key={idx} variant="outline">{action}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-destructive">No actions configured</p>
                )}
              </div>
            </div>
            {workflow?.integrations?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Integrations:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {workflow.integrations.map((integration, idx) => (
                    <Badge key={idx} variant="outline">{integration}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Model
              {modelConfig.model ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{modelConfig.model || 'Not set'}</p>
          </CardContent>
        </Card>

        {/* Backend Deployment Error */}
        {deploymentError && !deploymentResult?.success && (
          <Card className="border-destructive bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Deployment Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive/90 mb-3">{deploymentError}</p>
              <Accordion type="single" collapsible className="mb-3">
                <AccordionItem value="details" className="border-0">
                  <AccordionTrigger className="text-xs text-destructive/80 hover:text-destructive py-1">
                    Error details
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-destructive/70 pt-2">
                    {deploymentError}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeploymentError(null);
                  setDeploymentResult(null);
                }}
                className="h-8 text-xs border-destructive/30 hover:bg-destructive/20"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deployment Result */}
        {deploymentResult && (
          <Card className={deploymentResult.success ? 'border-green-500' : 'border-destructive'}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {deploymentResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Deployment Successful
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Deployment Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deploymentResult.success ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Your agent is now live
                  </p>
                  {deploymentResult.agentUrl && (
                    <Button
                      onClick={() => navigate(deploymentResult.agentUrl!)}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Live Agent
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-destructive text-sm">
                    {deploymentResult.message || 'Deployment failed'}
                  </p>
                  <Button
                    onClick={handleDeploy}
                    variant="outline"
                    className="w-full"
                  >
                    Retry Deployment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Global Error */}
        {error && (
          <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        {!deploymentResult && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={!validation.isValid || isDeploying}
              className="flex-1"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                'Deploy Agent'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

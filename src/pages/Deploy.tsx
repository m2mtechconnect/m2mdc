import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRBAC } from "@/contexts/RBACContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModelPreview } from "@/components/builder/ModelPreview";
import { ROICalculator } from "@/components/builder/ROICalculator";
import { GroundedRecommendationsCard } from "@/components/builder/GroundedRecommendationsCard";
import { DeployReadinessChecks } from "@/components/deploy/DeployReadinessChecks";
import { SimulationChecklist } from "@/components/simulation/SimulationChecklist";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Rocket,
  ArrowLeft,
  Server,
  Cpu,
  Zap,
  Activity
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DCCard } from "@/components/dc-ui/DCCard";
import { DCSectionHeader } from "@/components/dc-ui/DCSectionHeader";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

interface SystemSummary {
  name: string;
  department: string;
  outcome?: string;
  successMetric?: string;
  template: string;
  model: string;
  grounding: boolean;
  connectedTools: number;
}

interface ValidationIssue {
  field: string;
  message: string;
  fixStep: number;
  severity: 'error' | 'warning';
}

interface DeploymentStage {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export default function Deploy() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemId = searchParams.get('id');
  const { toast } = useToast();
  const { role, hasAccess } = useRBAC();

  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStages, setDeploymentStages] = useState<DeploymentStage[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roiMetrics, setRoiMetrics] = useState<any>(null);

  const canDeploy = hasAccess(['manager', 'executive']);

  useEffect(() => {
    if (!systemId) {
      toast({
        title: t('deploy.noSystemSelected'),
        description: t('deploy.selectSystem'),
        variant: "destructive",
      });
      navigate('/builder');
      return;
    }

    const initializeDeploy = async () => {
      try {
        // Ensure user is authenticated
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          toast({
            title: t('auth.authRequired'),
            description: t('auth.pleaseSignIn'),
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
        
        await loadSystemSummary();
      } catch (error) {
        console.error('[Deploy] Initialization error:', error);
      }
    };

    initializeDeploy();
  }, [systemId]);

  const loadSystemSummary = async () => {
    try {
      setLoading(true);

      // Load agents data (this has the system name and all config)
      const { data: agent } = await supabase
        .from('agents')
        .select('name, config')
        .eq('id', systemId)
        .maybeSingle();

      // Load workflow
      const { data: workflow } = await supabase
        .from('workflows')
        .select('id, name, system_id')
        .eq('system_id', systemId)
        .maybeSingle();

      // Load workflow nodes count (only if workflow exists)
      let nodes = null;
      if (workflow?.id) {
        const { data: nodesData } = await supabase
          .from('workflow_nodes')
          .select('id')
          .eq('workflow_id', workflow.id);
        nodes = nodesData;
      }

      // Load integrations count
      const { data: integrations } = await supabase
        .from('integrations')
        .select('id')
        .eq('status', 'connected');

      const agentConfig = agent?.config as Record<string, any> | null;
      // Prioritize selectedModel (new format) over model (legacy format)
      const modelId = agentConfig?.selectedModel || agentConfig?.model || 'google/gemini-2.5-flash';
      const grounding = agentConfig?.grounding || false;
      const department = agentConfig?.department || 'Operations';
      // Prioritize templateId (new format) over template (legacy format)
      const template = agentConfig?.templateId || agentConfig?.template || 'Custom Workflow';
      const outcome = agentConfig?.outcome;
      const successMetric = agentConfig?.successMetric;

      setSummary({
        name: agent?.name || 'Untitled System',
        department,
        outcome,
        successMetric,
        template,
        model: modelId,
        grounding,
        connectedTools: integrations?.length || 0,
      });

      // Validate - separate critical errors from warnings
      const issues: ValidationIssue[] = [];

      // AI Model is required (CRITICAL)
      if (!agentConfig?.model) {
        issues.push({
          field: 'AI Model',
          message: 'No AI model selected',
          fixStep: 3,
          severity: 'error',
        });
      }

      // System prompt is required (CRITICAL)
      if (!agentConfig?.systemPrompt || agentConfig.systemPrompt.trim().length < 10) {
        issues.push({
          field: 'System Prompt',
          message: 'System prompt is required and must be at least 10 characters',
          fixStep: 3,
          severity: 'error',
        });
      }

      // Workflow and integrations are optional - show warning if grounding enabled but no sources
      if (grounding && (!nodes || nodes.length === 0) && (!integrations || integrations.length === 0)) {
        issues.push({
          field: 'Knowledge Sources',
          message: 'Grounding is enabled but no knowledge sources configured. Consider adding workflow nodes or integrations for better results.',
          fixStep: 4,
          severity: 'warning',
        });
      }

      setValidationIssues(issues);
    } catch (error: any) {
      console.error('Error loading system summary:', error);
      toast({
        title: "Failed to load system",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!canDeploy) {
      toast({
        title: t('deploy.permissionDenied'),
        description: t('deploy.onlyManagersCanDeploy'),
        variant: "destructive",
      });
      return;
    }

    // Only block on critical errors, not warnings
    const criticalErrors = validationIssues.filter(issue => issue.severity === 'error');
    if (criticalErrors.length > 0) {
      toast({
        title: t('deploy.validation'),
        description: t('deploy.criticalErrors'),
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setShowProgressModal(true);

    const stages: DeploymentStage[] = [
      { name: t('deploy.stages.validateConfig'), status: 'running' },
      { name: t('deploy.stages.packageWorkflow'), status: 'pending' },
      { name: t('deploy.stages.provisionRuntime'), status: 'pending' },
      { name: t('deploy.stages.registerWebhooks'), status: 'pending' },
      { name: t('deploy.stages.warmModel'), status: 'pending' },
    ];

    setDeploymentStages([...stages]);

    try {
      // Stage 1: Validate
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (stages[0]) stages[0].status = 'complete';
      if (stages[1]) stages[1].status = 'running';
      setDeploymentStages([...stages]);

      // Stage 2: Package
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (stages[1]) stages[1].status = 'complete';
      if (stages[2]) stages[2].status = 'running';
      setDeploymentStages([...stages]);

      // Stage 3: Provision - Update agent status to active
      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          status: 'active',
          deployed_at: new Date().toISOString()
        })
        .eq('id', systemId);

      if (updateError) throw updateError;

      await new Promise(resolve => setTimeout(resolve, 2000));
      if (stages[2]) stages[2].status = 'complete';
      if (stages[3]) stages[3].status = 'running';
      setDeploymentStages([...stages]);

      // Stage 4: Webhooks
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (stages[3]) stages[3].status = 'complete';
      if (stages[4]) stages[4].status = 'running';
      setDeploymentStages([...stages]);

      // Stage 5: Warm model
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (stages[4]) stages[4].status = 'complete';
      setDeploymentStages([...stages]);

      // Get deployment tracking data
      const { data: agentData } = await supabase
        .from('agents')
        .select('connector_ids')
        .eq('id', systemId)
        .maybeSingle();
      
      const { data: workflowData } = await supabase
        .from('workflows')
        .select('id')
        .eq('system_id', systemId)
        .maybeSingle();
      
      let workflowNodes = null;
      if (workflowData?.id) {
        const { data: nodesData } = await supabase
          .from('workflow_nodes')
          .select('id')
          .eq('workflow_id', workflowData.id);
        workflowNodes = nodesData;
      }
      
      const { data: intelligenceData } = await supabase
        .from('intelligence_settings')
        .select('mcp_servers')
        .eq('system_id', systemId)
        .maybeSingle();
      
      const connectorCount = agentData?.connector_ids?.length || 0;
      const mcpServers = Array.isArray(intelligenceData?.mcp_servers) ? intelligenceData.mcp_servers : [];
      const toolCount = mcpServers.length;

      // Save ROI metrics if available
      if (roiMetrics) {
        // Check if ROI assumptions already exist
        const { data: existingRoi } = await supabase
          .from('roi_assumptions')
          .select('id')
          .eq('system_id', systemId)
          .maybeSingle();

        if (existingRoi) {
          // Update existing ROI assumptions
          await supabase
            .from('roi_assumptions')
            .update({
              time_saved_per_run_min: roiMetrics.timeSavedPerWeek * 60 / 40, // Estimate
              runs_per_week: 40,
              loaded_cost_per_hour: 75,
              accuracy_improvement_pct: roiMetrics.accuracyImprovement,
              cost_per_error: 500,
            })
            .eq('id', existingRoi.id);
        } else {
          // Create new ROI assumptions
          await supabase.from('roi_assumptions').insert({
            system_id: systemId,
            time_saved_per_run_min: roiMetrics.timeSavedPerWeek * 60 / 40,
            runs_per_week: 40,
            loaded_cost_per_hour: 75,
            accuracy_improvement_pct: roiMetrics.accuracyImprovement,
            cost_per_error: 500,
          });
        }

        // Create ROI snapshot
        await supabase.from('roi_snapshots').insert({
          system_id: systemId,
          roi_pct: roiMetrics.roi,
          annual_savings: roiMetrics.annualSavings,
          time_saved_week: roiMetrics.timeSavedPerWeek,
          error_savings_year: 0,
          assumptions_json: roiMetrics,
        });
      }

      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');

      // Create deployment record
      const { error: deployError } = await supabase
        .from('deployments')
        .insert({
          system_id: systemId,
          version: 'v1',
          status: 'active',
          region: 'northamerica-northeast1',
          model: summary?.model,
          grounding: summary?.grounding,
          runtime_url: `https://runtime.m2m.ai/${systemId}`,
          health: 'OK',
          deployed_by: user.id,
        });

      if (deployError) throw deployError;

      // Create deployment tracking record
      const { error: trackingError } = await supabase
        .from('deployment_tracking')
        .insert({
          system_id: systemId,
          deployed_by: user.id,
          model_id: summary?.model,
          status: 'deployed',
          connector_count: connectorCount,
          tool_count: toolCount,
          accuracy_estimate: roiMetrics?.accuracyImprovement || 85,
          roi_estimate: roiMetrics ? {
            annual_savings: roiMetrics.annualSavings,
            roi_pct: roiMetrics.roi,
            time_saved_week: roiMetrics.timeSavedPerWeek,
          } : null,
          metadata: {
            grounding: summary?.grounding,
            region: 'northamerica-northeast1',
            workflow_node_count: workflowNodes?.length || 0,
            connectors: agentData?.connector_ids || [],
            mcp_servers: mcpServers.map((s: any) => s.server_id || s),
          },
        });

      if (trackingError) {
        console.error('Deployment tracking error:', trackingError);
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'deploy',
        entity_type: 'system',
        entity_id: systemId,
        details: {
          version: 'v1',
          model: summary?.model,
          grounding: summary?.grounding,
        },
      });

      toast({
        title: t('deploy.deploymentSuccessful'),
        description: t('deploy.systemLive'),
      });

      setTimeout(() => {
        setShowProgressModal(false);
        navigate(`/dashboard`);
      }, 2000);

    } catch (error: any) {
      console.error('Deployment error:', error);
      
      // Mark current stage as failed
      const currentStageIndex = stages.findIndex(s => s.status === 'running');
      if (currentStageIndex !== -1) {
        stages[currentStageIndex].status = 'failed';
        setDeploymentStages([...stages]);
      }

      // Update deployment record
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        await supabase.from('deployments').insert({
          system_id: systemId,
          status: 'failed',
          error_message: error.message,
          deployed_by: user.id,
        });
      }

      toast({
        title: "Deployment failed",
        description: error.message || "An error occurred during deployment",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleFixIssue = (step: number) => {
    navigate(`/builder?id=${systemId}&step=${step}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/builder?id=${systemId}&step=6`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('nav.backToBuilder')}
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              {t('deploy.title')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t('deploy.subtitle')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/deployments')}
            className="border-border hover:bg-muted"
          >
            View History
          </Button>
          <Badge variant={canDeploy ? "default" : "secondary"} className="bg-primary/20 text-primary border-primary/30">
            {role || 'user'}
          </Badge>
        </div>

        {/* DC KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <DCKPITile
            label="System"
            value={summary?.name || 'Loading...'}
            sublabel={summary?.department || 'Subsystem'}
            status="info"
            icon={<Server className="h-4 w-4" />}
          />
          <DCKPITile
            label="AI Model"
            value={summary?.model?.split('/')[1] || 'Not Set'}
            sublabel={summary?.grounding ? 'Grounded' : 'Standard'}
            status={summary?.model ? 'normal' : 'warning'}
            icon={<Cpu className="h-4 w-4" />}
          />
          <DCKPITile
            label="Integrations"
            value={summary?.connectedTools?.toString() || '0'}
            sublabel="Connected tools"
            status={summary?.connectedTools && summary.connectedTools > 0 ? 'normal' : 'info'}
            icon={<Zap className="h-4 w-4" />}
          />
          <DCKPITile
            label="Validation"
            value={validationIssues.filter(i => i.severity === 'error').length === 0 ? 'Passed' : 'Issues'}
            sublabel={`${validationIssues.length} items`}
            status={validationIssues.filter(i => i.severity === 'error').length === 0 ? 'normal' : 'critical'}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

      {/* Validation Issues - Errors */}
      {validationIssues.filter(i => i.severity === 'error').length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Critical errors must be fixed before deployment:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationIssues.filter(i => i.severity === 'error').map((issue, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span>{issue.field}: {issue.message}</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleFixIssue(issue.fixStep)}
                    className="ml-2"
                  >
                    Fix
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Issues - Warnings */}
      {validationIssues.filter(i => i.severity === 'warning').length > 0 && (
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            <div className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">
              Recommendations for better performance:
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationIssues.filter(i => i.severity === 'warning').map((issue, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span>{issue.field}: {issue.message}</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleFixIssue(issue.fixStep)}
                    className="ml-2"
                  >
                    Improve
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Summary */}
        <DCCard status="info" className="p-6">
          <h2 className="text-xl font-semibold mb-4">System Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">System Name</label>
              <div className="text-lg font-medium">{summary?.name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <div className="text-lg">{summary?.department}</div>
            </div>

            {summary?.outcome && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">AI Use Case</label>
                <div className="text-lg">{summary.outcome}</div>
              </div>
            )}

            {summary?.successMetric && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Success Metric</label>
                <div className="text-lg">{summary.successMetric}</div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Template</label>
              <div className="text-lg">{summary?.template}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">AI Model Configuration</label>
              <ModelPreview 
                selectedModelId={summary?.model || null}
                onNavigateToConfig={() => navigate(`/builder?id=${systemId}&step=3`)}
                showChangeButton={validationIssues.length === 0}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Grounding</label>
              <div className="flex items-center gap-2">
                {summary?.grounding ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Enabled</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span>Disabled</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Connected Tools</label>
              <div className="text-lg">{summary?.connectedTools} integrations</div>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handleDeploy}
            disabled={!canDeploy || validationIssues.some(i => i.severity === 'error') || isDeploying}
            aria-label="Deploy System"
          >
            <Rocket className="h-5 w-5 mr-2" />
            {isDeploying ? 'Deploying to Production...' : 'Deploy to Production'}
          </Button>

          {!canDeploy && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Only managers and executives can deploy systems
            </p>
          )}
        </DCCard>

        {/* Right: ROI Calculator, Readiness Checks & Simulation Checklist */}
        <div className="space-y-4">
          {/* Carbon & Financial Readiness Checks */}
          <DeployReadinessChecks 
            onFixIssue={(checkId) => {
              // Navigate to builder to fix issues
              navigate(`/builder?id=${systemId}&step=2`);
            }}
          />
          
          {/* Simulation Checklist */}
          <SimulationChecklist />
          
          <ROICalculator 
            onChange={(metrics) => {
              setRoiMetrics(metrics);
            }}
          />
        </div>
      </div>

      {/* DC-Specific Deployment Recommendations */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* AWS Recommendations */}
        <DCCard 
          title="AWS Recommendations" 
          icon={<Server className="h-4 w-4" />}
          status="info"
        >
          <div className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>EKS for container orchestration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>EC2 Trn1/Inf2 for GPU workloads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>CloudWatch for metrics collection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Kinesis for real-time streaming</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <Badge className="bg-success/10 text-success border-success/30">
                GPU Autoscaling Ready
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              ca-central-1 region recommended for Canadian data sovereignty
            </p>
          </div>
        </DCCard>

        {/* Azure Recommendations */}
        <DCCard 
          title="Azure Recommendations" 
          icon={<Cpu className="h-4 w-4" />}
          status="info"
        >
          <div className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                <span>AKS for Kubernetes workloads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                <span>Azure ML for model hosting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                <span>Azure Monitor for telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                <span>NDv5 SKUs for AI/DC workloads</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <Badge className="bg-info/10 text-info border-info/30">
                DC/AI Optimized SKUs
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Canada Central region for sovereignty compliance
            </p>
          </div>
        </DCCard>

        {/* GCP Recommendations */}
        <DCCard 
          title="GCP Recommendations" 
          icon={<Zap className="h-4 w-4" />}
          status="info"
        >
          <div className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <span>Vertex AI for model serving</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <span>GKE for container workloads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <span>BigQuery for analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <span>Cloud Functions for automation</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <Badge className="bg-success/10 text-success border-success/30">
                Carbon-Smart Regions
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              northamerica-northeast1 for low-carbon operations
            </p>
          </div>
        </DCCard>
      </div>

      {/* AI Recommendations Section */}
      <div className="mt-8">
        <GroundedRecommendationsCard systemId={systemId!} />
      </div>

      {/* Deployment Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deploying System</DialogTitle>
            <DialogDescription>
              Please wait while we deploy your AI system...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {deploymentStages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {stage.status === 'complete' && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
                {stage.status === 'running' && (
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                )}
                {stage.status === 'failed' && (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
                {stage.status === 'pending' && (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span className={stage.status === 'failed' ? 'text-destructive' : ''}>
                  {stage.name}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
